// Jembatan aman antara aplikasi (HTML) dan sistem file komputer
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const hasLocalFonts = (() => { try { return fs.existsSync(path.join(__dirname, 'app', 'fonts', 'fonts.css')); } catch (e) { return false; } })();

contextBridge.exposeInMainWorld('pricelistNative', {
  isNative: true,
  platform: process.platform,
  hasLocalFonts,
  saveProject: (existingPath, suggestedName) => ipcRenderer.invoke('save-project', existingPath, suggestedName),
  writeFile: (p, bytes) => ipcRenderer.invoke('write-file', p, bytes),
  readFile: p => ipcRenderer.invoke('read-file', p),
  exists: p => ipcRenderer.invoke('exists', p),
  openProjectDialog: () => ipcRenderer.invoke('open-project-dialog'),
  saveExport: (name, bytes) => ipcRenderer.invoke('save-export', name, bytes),
  onOpenPath: cb => ipcRenderer.on('open-path', (_e, p) => cb(p)),
  ready: () => ipcRenderer.send('renderer-ready')
});
