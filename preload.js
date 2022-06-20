// preload.js
//const { contextBridge } = require("electron");

//contextBridge.exposeInMainWorld("teste", "hello");

//renderer.js

//console.log(window.teste)

function doIt() {
  const remote = require('@electron/remote');
  const FindInPage = require('electron-find').FindInPage;
  const { ipcRenderer } = require('electron');

  console.log('xxx');
  const webContents = remote.getCurrentWebContents();
  let findInPage = new FindInPage(webContents);
  console.log('yyyy', findInPage)

  ipcRenderer.on('on-find', (e, args) => {
    console.log('zzzz')
    findInPage.openFindWindow()
  })

  //webContents.send('on-find');  
}

setTimeout(doIt, 5000);