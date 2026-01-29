const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (options) => ipcRenderer.invoke('open-file', options),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  readData: (filename) => ipcRenderer.invoke('read-data', filename),
  writeData: (data) => ipcRenderer.invoke('write-data', data),
  // Preferences and home directory
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  savePreferences: (preferences) => ipcRenderer.invoke('save-preferences', preferences),
  selectHomeDirectory: () => ipcRenderer.invoke('select-home-directory'),
  getHomeDirectory: () => ipcRenderer.invoke('get-home-directory'),
  migrateData: (data) => ipcRenderer.invoke('migrate-data', data),
  // HTTP request (bypasses CORS)
  httpRequest: (data) => ipcRenderer.invoke('http-request', data),
});

