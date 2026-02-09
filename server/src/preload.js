const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('glotv', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  loadConfig: (folder) => ipcRenderer.invoke('load-config', folder),
  saveConfig: (folder, config) => ipcRenderer.invoke('save-config', folder, config),
  scanFiles: (folder) => ipcRenderer.invoke('scan-files', folder),
});
