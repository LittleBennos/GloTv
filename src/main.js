const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { SlideManager } = require('./slideManager');

let win;
let slideManager;

const config = require(path.join(__dirname, '..', 'config.json'));

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.setMenuBarVisibility(false);

  // ESC to exit
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'Escape') app.quit();
  });

  if (process.env.GLOTV_DEV) {
    win.webContents.openDevTools({ mode: 'detach' });
    win.setFullScreen(false);
  }
}

app.whenReady().then(async () => {
  // Register protocol to serve local files
  protocol.registerFileProtocol('glotv', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('glotv:///', ''));
    callback({ path: filePath });
  });

  createWindow();

  slideManager = new SlideManager(config);

  ipcMain.handle('get-config', () => ({
    slideDuration: config.slideDuration,
    transitionDuration: config.transitionDuration,
  }));

  ipcMain.handle('get-pdfs', () => slideManager.getPdfs());

  slideManager.on('slides-updated', (pdfs) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('slides-updated', pdfs);
    }
  });

  await slideManager.start();
});

app.on('window-all-closed', () => app.quit());
