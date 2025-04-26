// Préload.js expose l'API vers le Renderer
// preload.js
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  createPayment: data => ipcRenderer.invoke('payment:create', data),
  getPayments: () => ipcRenderer.invoke('payment:all'),
  updatePayment: data => ipcRenderer.invoke('payment:update', data),
  deletePayment: id => ipcRenderer.invoke('payment:delete', id),
  updateBySource: params => ipcRenderer.invoke('payment:updateBySource', params),
  getBalance: () => ipcRenderer.invoke('money:get'),
  getLimitDate: () => ipcRenderer.invoke('money:getLimitDate'),
  setLimitDate: date => ipcRenderer.invoke('money:setLimitDate', date)
});