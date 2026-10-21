const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('docQA', {
  getProviders: () => ipcRenderer.invoke('get-providers'),
  selectAndUploadDocument: () => ipcRenderer.invoke('select-and-upload-document'),
  askQuestion: (payload) => ipcRenderer.invoke('ask-question', payload),
  retrievePreview: (payload) => ipcRenderer.invoke('retrieve-preview', payload),
});
