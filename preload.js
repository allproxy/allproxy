const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('darkMode', {
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
  system: () => ipcRenderer.invoke('dark-mode:system')
})

function render() {
  const remote = require('@electron/remote');
  const FindInPage = require('electron-find').FindInPage;
  const { ipcRenderer } = require('electron');

  const webContents = remote.getCurrentWebContents();
  let findInPage = new FindInPage(webContents);

  ipcRenderer.on('on-find', (e, args) => {
    findInPage.openFindWindow()
  })
}

setTimeout(render, 5000);