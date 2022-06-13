const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

console.log('Starting main.js');
process.env.NODE_ENV = 'production';
const dirName = __dirname;
const dataDir = `${process.env.HOME + path.sep}allproxy`;
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
      autoHideMenuBar: true
    }
  );
  //win.maximize();
  setTimeout(() => {
    win.loadURL('http://localhost:8888/allproxy')
      .then(() => {
        console.log('main.js: AllProxy page loaded');
      })

    switch (process.platform) {
      case 'darwin':
        fs.copyFileSync(`${dirName + path.sep}/bin/macos/installCa.sh`, `${dataDir}/bin/installCa.sh`);
        break;
      case 'win32':
        fs.copyFileSync(`${dirName + path.sep}bin\\win32\\installCa.bat`, `${dataDir}\\bin\\installCa.bat`);
        break;
      case 'linux':
        fs.copyFileSync(`${dirName + path.sep}/bin/linux/installCa.sh`, `${dataDir}/bin/installCa.sh`);
        break;
    }
  }, 1000);
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
