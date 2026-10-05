const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sqliteAPI', {
  init: () => ipcRenderer.invoke('sqlite:init'),
  getAll: name => ipcRenderer.invoke('sqlite:getAll', name),
  getOne: (name, id) => ipcRenderer.invoke('sqlite:getOne', name, id),
  add: (name, obj) => ipcRenderer.invoke('sqlite:add', name, obj),
  put: (name, obj) => ipcRenderer.invoke('sqlite:put', name, obj),
  remove: (name, id) => ipcRenderer.invoke('sqlite:delete', name, id),
  clear: name => ipcRenderer.invoke('sqlite:clear', name),
  backup: () => ipcRenderer.invoke('sqlite:backup')
});
