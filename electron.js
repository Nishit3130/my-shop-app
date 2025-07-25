const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,    // Recommended for security
      contextIsolation: true,   // Recommended for security
      preload: path.join(__dirname, 'preload.js') 
    },
    icon: path.join(__dirname, 'src/assets/icon.png') // ACTION: Replace with your actual icon path e.g. src/assets/KSB.png
  });

  // Path to your Angular app's index.html
  // This path must match the output from your 'ng build --configuration electron'
  // Assuming your angular.json's "electron" config outputPath is "dist/my-shop-app-electron",
  // and the builder creates a "browser" subfolder for client assets:
  const startUrl = url.format({
    pathname: path.join(__dirname, 'dist/my-shop-app-electron/browser/index.html'), // VERIFY THIS PATH!
    protocol: 'file:',
    slashes: true
  });
  
  console.log(`[Electron Main] Attempting to load Angular app from: ${startUrl}`);
  mainWindow.loadURL(startUrl)
    .then(() => {
      console.log('[Electron Main] Angular app loaded successfully.');
    })
    .catch(err => {
      console.error('[Electron Main] Failed to load Angular app:', err);
      // Optionally, load a fallback error page or show a dialog
      // mainWindow.loadFile(path.join(__dirname, 'error.html')); 
    });


  // Optional: Open DevTools for development
  // if (!app.isPackaged) { // Check if running in packaged app or development
  //   mainWindow.webContents.openDevTools();
  // }

  // Optional: Remove default application menu
  // Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});