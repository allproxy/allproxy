const { app, BrowserWindow } = require('electron');

process.env.NODE_ENV = 'production';
require('./build/app.js')


const createWindow = () => {
  const win = new BrowserWindow()
  win.maximize();
  setTimeout(() => win.loadURL('http://localhost:8888/allproxy'), 1000);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})