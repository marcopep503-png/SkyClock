'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// The only things the page is allowed to ask the app to do.
contextBridge.exposeInMainWorld('skyclock', {
  notify: (title, body) => ipcRenderer.send('notify', String(title), String(body)),
  getPin: () => ipcRenderer.invoke('pin:get'),
  togglePin: () => ipcRenderer.invoke('pin:toggle'),
  lookupLocation: () => ipcRenderer.invoke('geo:lookup'),
  keepAwake: on => ipcRenderer.send('power:keep', !!on),
  reload: () => ipcRenderer.send('win:reload'),
  minimize: () => ipcRenderer.send('win:minimize'),
  hide: () => ipcRenderer.send('win:hide'),
  getPos: () => ipcRenderer.invoke('win:getPos'),
  setPos: (x, y) => ipcRenderer.send('win:setPos', Number(x), Number(y)),
  getShortcuts: () => ipcRenderer.invoke('shortcuts:get'),
  setShortcut: (name, accel) => ipcRenderer.invoke('shortcuts:set', String(name), String(accel)),
  resetShortcuts: () => ipcRenderer.invoke('shortcuts:reset'),
  pauseShortcuts: on => ipcRenderer.send('shortcuts:pause', !!on),
  onTheme: cb => ipcRenderer.on('theme:toggle', () => cb()),
  onFlip: cb => ipcRenderer.on('flip:toggle', () => cb()),
  onInd: cb => ipcRenderer.on('ind:toggle', () => cb()),
});
