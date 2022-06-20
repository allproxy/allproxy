// preload.js
//const { contextBridge } = require("electron");

//contextBridge.exposeInMainWorld("teste", "hello");

//renderer.js

//console.log(window.teste)

function doIt() {
  const remote = require('@electron/remote');
  const FindInPage = require('electron-find').FindInPage;
  const { ipcRenderer } = require('electron');

  const webContents = remote.getCurrentWebContents();
  let findInPage = new FindInPage(webContents);
  
  ipcRenderer.on('on-find', (e, args) => {    
    findInPage.openFindWindow()
  }) 
}

setTimeout(doIt, 5000);