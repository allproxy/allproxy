const { app, BrowserWindow, globalShortcut } = require('electron');
const Renderer = require('electron/renderer');
const fs = require('fs');
const path = require('path');

console.log('Starting main.js');
process.env.NODE_ENV = 'production';
const dirName = __dirname;
const dataDir = `${process.env.HOME + path.sep}.allproxy`;
process.env.ALLPROXY_DATA_DIR = dataDir;

const mkDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const startServer = () => {
  mkDir(dataDir);
  mkDir(`${dataDir + path.sep}intercept`);
  if (!fs.existsSync(`${dataDir + path.sep}intercept${path.sep}InterceptResponse.js`)) {
    fs.copyFileSync(`${dirName + path.sep}intercept${path.sep}InterceptResponse.js`, `${dataDir + path.sep}intercept${path.sep}InterceptResponse.js`);
  }
  mkDir(`${dataDir + path.sep}proto`);
  mkDir(`${dataDir + path.sep}bin`);
  require('./build/app.js');
};

const createWindow = () => {
  const win = new BrowserWindow(
    {
      icon: path.join(__dirname, "icons/icon.png"),
      width: 1024,
      height: 768,
      autoHideMenuBar: true,
      show: false,
      backgroundColor: 'black',
      webPreferences: {
        preload: path.join(__dirname, "preload.js")
      }
    }
  );

  require('@electron/remote/main').initialize()
  require("@electron/remote/main").enable(win.webContents)

  //win.maximize();
  setTimeout(() => {
    win.loadURL('http://localhost:8888/allproxy')
      .then(() => {
        console.log('main.js: AllProxy page loaded');
        win.show()

        // ctl-f - send on-find event to preload.js to open find dialog
        win.on('focus', () => {
          globalShortcut.register('CommandOrControl+F', () => {
            // send event to preload.js to
            win.webContents.send('on-find');
          });
        });
        win.on('blur', () => {
          globalShortcut.unregister('CommandOrControl+F');
        });
      })
  }, 2000);
};

startServer();

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  /*if (process.platform !== 'darwin')*/ app.quit();
});
