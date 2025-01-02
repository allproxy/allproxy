import fs from 'fs';
import path from 'path';

// Valid paths are allproxy and logviewer
let appName = 'allproxy';
if (process.env.ALLPROXY_APP) {
  appName = process.env.ALLPROXY_APP;
}

console.log('Starting main.js', appName);
process.env.NODE_ENV = 'production';
const dirName = __dirname;
const home = process.env.HOME ? process.env.HOME : process.env.USERPROFILE;
let dataDir = `${home + path.sep}.allproxy`;
if (process.env.ALLPROXY_DATA_DIR) {
  dataDir = process.env.ALLPROXY_DATA_DIR;
} else {
  process.env.ALLPROXY_DATA_DIR = dataDir;
}

console.log(`Data directory: ${dataDir}`)

let headless = process.env.HEADLESS

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
  mkDir(`${dataDir + path.sep}sessions`);
  mkDir(`${dataDir + path.sep}jsonFields`);
  mkDir(`${dataDir + path.sep}scripts`);
  mkDir(`${dataDir + path.sep}queries`);
  require('./app.js');
};

startServer();

if (headless) {
  openBrowser();
  async function openBrowser() {
    try {
      const url = `http://localhost:8888/${appName}`;
      console.log(`Open ${url} in browser`);
      const open = await import('open');
      open.default(url);
    } catch (e) { console.log(e); }
  }
} else {
  const { app, BrowserWindow, globalShortcut, ipcMain, nativeTheme } = require('electron');

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
      win.loadURL('http://localhost:8888/' + appName)
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

          ipcMain.handle('dark-mode:toggle', () => {
            if (nativeTheme.shouldUseDarkColors) {
              nativeTheme.themeSource = 'light'
            } else {
              nativeTheme.themeSource = 'dark'
            }
            return nativeTheme.shouldUseDarkColors
          })

          ipcMain.handle('dark-mode:system', () => {
            nativeTheme.themeSource = 'system'
          })
        })
    }, 2000);
  };

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
  /*if (process.platform !== 'darwin')*/ app.quit();
  });
}
