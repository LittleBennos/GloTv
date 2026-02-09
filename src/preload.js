const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('glotv', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  getPdfs: () => ipcRenderer.invoke('get-pdfs'),
  onSlidesUpdated: (callback) => {
    ipcRenderer.on('slides-updated', (_event, pdfs) => callback(pdfs));
  },
});
