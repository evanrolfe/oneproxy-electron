const ipc = require('./server-ipc');
const Database = require('./lib/database.js');

console.log('Starting backend server...');

// TODO: Refactor to not use global vars:
const db = new Database(process.argv[5]);
global.puppeteer_browsers = [];
global.db = db;

if (process.argv[2] === '--subprocess') {
  const socketName = process.argv[4];

  ipc.init(socketName);
} else {
  // eslint-disable-next-line global-require
  const { ipcRenderer } = require('electron');

  ipcRenderer.on('set-socket', (event, { name }) => {
    ipc.init(name);
  });
}

[
  `SIGINT`,
  `SIGUSR1`,
  `SIGUSR2`,
  `uncaughtException`,
  `SIGTERM`,
  `SIGHUP`
].forEach(eventType => {
  process.on(eventType, () => {
    console.log('Exiting the backend server...');
    console.log(`Closing ${global.puppeteer_browsers.length} browsers...`);

    global.puppeteer_browsers.forEach(browser => {
      browser.close();
    });

    return process.exit(0);
  });
});
