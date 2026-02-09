const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('glotv', {
  getSharedFolder: () => ipcRenderer.invoke('get-shared-folder'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  scanFiles: () => ipcRenderer.invoke('scan-files'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
});
