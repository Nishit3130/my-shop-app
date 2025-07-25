const { contextBridge } = require('electron');

console.log('[Preload Script] Loaded into new project.');

contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    // If your Angular app needs to call any Electron main process functions 
    // or Node.js modules, you would define bridge functions here.
    // For a simple "just package my web app", this can be minimal.
    ping: () => 'pong from preload' 
  }
);