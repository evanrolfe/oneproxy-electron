import http from 'http';
import tls from 'tls';
import { argv } from 'yargs';
import httpolyglot from 'httpolyglot';
import log from 'electron-log';

import proxyIPC from '../shared/ipc-server';
import database from '../shared/database';
import {
  DATABASE_FILES,
  PROXY_SOCKET_NAMES,
  INTERCEPT_SOCKET_NAMES
} from '../shared/constants';
import certUtils from '../shared/cert-utils';

import proxyRequestListener from './proxy-request-listener';
import InterceptServer from './intercept-server';
import handleUpgrade from './websocket-handler';

const mightBeTLSHandshake = byte => byte === 22;

const peekFirstByte = socket =>
  new Promise(resolve => {
    socket.once('data', data => {
      socket.pause();
      socket.unshift(data);
      resolve(data[0]);
    });
  });

const startIPCServer = () => {
  const socketName = PROXY_SOCKET_NAMES[process.env.NODE_ENV];
  proxyIPC.init(socketName, {});
  log.info(`[Proxy] IPC server listening on socket: ${socketName}`);
};

const startInterceptServer = () => {
  const socketName = INTERCEPT_SOCKET_NAMES[process.env.NODE_ENV];
  const interceptServer = new InterceptServer(socketName);
  interceptServer.init();
  global.interceptServer = interceptServer;
  log.info(`[Proxy] Intercept server started`);
};

const startServer = async () => {
  log.info(`[Proxy] Starting proxy server in mode: ${process.env.NODE_ENV}`);
  let dbFile;

  if (argv.db === undefined) {
    dbFile = DATABASE_FILES[process.env.NODE_ENV];
    log.info(
      `[Proxy] No --db arg given, using default database file: ${dbFile}`
    );
  } else {
    dbFile = argv.db;
  }

  log.info(`[Proxy] Loading database from  ${dbFile}`);
  global.knex = await database.setupDatabaseStore(dbFile);
  log.info(`[Proxy] Database loaded.`);

  const defaultCert = certUtils.getCertKeyPair();

  const server = httpolyglot.createServer(
    {
      key: defaultCert.key,
      cert: defaultCert.cert,
      ca: [defaultCert.cert]
    },
    proxyRequestListener
  );

  server.addListener('connect', (req, socket) => {
    const [targetHost, port] = req.url.split(':');

    socket.once('error', e => log.error('[Proxy] Error on client socket', e));

    socket.write(
      `HTTP/${req.httpVersion} 200 OK\r\n\r\n`,
      'utf-8',
      async () => {
        const firstByte = await peekFirstByte(socket);

        // Tell later handlers whether the socket wants an insecure upstream
        socket.upstreamEncryption = mightBeTLSHandshake(firstByte);

        if (socket.upstreamEncryption) {
          log.debug(`[Proxy] Unwrapping TLS connection to ${targetHost}`);
          unwrapTLS(targetHost, port, socket);
        } else {
          // Non-TLS CONNECT, probably a plain HTTP websocket. Pass it through untouched.
          log.debug(`[Proxy] Passing through connection to ${targetHost}`);
          server.emit('connection', socket);
          socket.resume();
        }
      }
    );
  });

  server.on('upgrade', handleUpgrade);

  const unwrapTLS = (targetHost, port, socket) => {
    const tlsSocket = new tls.TLSSocket(socket, {
      isServer: true,
      server: server,
      secureContext: tls.createSecureContext({
        key: defaultCert.key,
        cert: defaultCert.cert,
        ca: defaultCert.cert
      })
    });

    // Wait for:
    // * connect, not dropped -> all good
    // * _tlsError before connect -> cert rejected
    // * sudden end before connect -> cert rejected
    new Promise((resolve, reject) => {
      tlsSocket.on('secure', () => {
        resolve();
      });

      tlsSocket.on('_tlsError', error => {
        reject(error);
      });

      tlsSocket.on('end', () => {
        // Delay, so that simultaneous specific errors reject first
        // eslint-disable-next-line prefer-promise-reject-errors
        setTimeout(() => reject('closed'), 1);
      });
    }).catch(cause => log.warn(`[Proxy] tlsSocket FAILED: ${cause}`));

    const innerServer = http.createServer((req, res) => {
      // Request URIs are usually relative here, but can be * (OPTIONS) or absolute (odd people) in theory
      if (req.url !== '*' && req.url[0] === '/') {
        req.url = `https://${targetHost}:${port}${req.url}`;
      }
      return proxyRequestListener(req, res);
    });
    innerServer.addListener('upgrade', (req, innerSocket, head) => {
      req.url = `https://${targetHost}:${port}${req.url}`;
      server.emit('upgrade', req, innerSocket, head);
    });
    innerServer.addListener('connect', (req, res) =>
      server.emit('connect', req, res)
    );

    innerServer.emit('connection', tlsSocket);
  };

  server.listen(8080);
  log.info('[Proxy] Server listening on 8080');
};

// To Test:
// curl https://linuxmint.com --proxy http://127.0.0.1:8080 --cacert tmp/testCA.pem  --insecure
if (process.env.NODE_ENV === undefined) {
  throw new Error(
    `You must set the NODE_ENV var!\ni.e. NODE_ENV=development yarn start-proxy`
  );
}

startInterceptServer();
startIPCServer();
startServer();
