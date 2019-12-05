const RawIPC = require('node-ipc').IPC;
const { once, EventEmitter } = require('events');
const mainIpc = require('../server-ipc');

const ipc = new RawIPC();

/*
 * InterceptServer: communicates with the BrowserInterceptPage on the frontend.
 * It starts an ipc server on the channel "intercept".
 * When a request is intercepted it first sends a "requestIntercepted" message
 * to the client on the mainIpc channel. It then waits until the a decision
 * message is received on the intercept channel and it will then either
 * forward the request or drop it depending on the message. If a new request is
 * queued while the first one is still waiting for the message from the client,
 * it will wait until that first request has completed to send a new
 * "requestIntercepted" message to the client. And the process repeats...
 */
class InterceptServer {
  constructor() {
    this.events = new EventEmitter();
    this.awaitingReply = false;

    this.events.on('requestQueued', async request => {
      if (this.awaitingReply === false) {
        this.awaitingReply = true;

        console.log(
          `[InterceptServer] Processing request ${request.id} from queue...`
        );
        mainIpc.send('requestIntercepted', { request: request });
      } else {
        setTimeout(() => {
          this.events.emit('requestQueued', request);
        }, 100);
      }
    });
  }

  init() {
    ipc.config.id = 'intercept';
    ipc.config.silent = true;

    ipc.serve(() => {
      ipc.server.on('message', data => {
        console.log(
          `[InterceptServer] Received IPC message: ${JSON.stringify(data)}`
        );
        this.events.emit(`requestDecision-${data.requestId}`, data);
      });
    });
    ipc.server.start();
    console.log(
      '[InterceptServer] Started IPC Intercept server, awaiting message from client...'
    );
  }

  queueRequest(request) {
    this.events.emit('requestQueued', request);
  }

  async decisionFromClient(request) {
    console.log(
      `[InterceptServer] requestToComplete ${request.id}, waiting...`
    );

    // NOTE: For some reason once() returns an array of the event arguments
    const [data] = await once(this.events, `requestDecision-${request.id}`);
    this.awaitingReply = false;

    console.log(
      `[InterceptServer]  request ${request.id} complete. action: ${
        data.action
      }`
    );

    return data.action;
  }
}

module.exports = InterceptServer;