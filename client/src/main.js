const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { SlideManager } = require('./slideManager');

let win;
let slideManager;

const config = require(path.join(__dirname, '..', 'config.json'));

function loadGloTvConfig() {
  const configPath = path.join(config.slidesFolder, 'glotv-config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading glotv-config.json:', err.message);
  }
  return null;
}

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

  win.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'Escape') app.quit();
  });

  if (process.env.GLOTV_DEV) {
    win.webContents.openDevTools({ mode: 'detach' });
    win.setFullScreen(false);
  }
}

app.whenReady().then(async () => {
  protocol.registerFileProtocol('glotv', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('glotv:///', ''));
    callback({ path: filePath });
  });

  createWindow();

  slideManager = new SlideManager(config);

  ipcMain.handle('get-config', () => {
    const glotvConfig = loadGloTvConfig();
    return {
      slideDuration: glotvConfig ? (glotvConfig.slideDuration || 10) * 1000 : config.slideDuration,
      transitionDuration: config.transitionDuration,
      schedule: glotvConfig ? glotvConfig.schedule : null,
    };
  });

  ipcMain.handle('get-pdfs', () => slideManager.getPdfs());

  slideManager.on('slides-updated', (pdfs, durations) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('slides-updated', pdfs, durations);
    }
  });

  await slideManager.start();
});

app.on('window-all-closed', () => app.quit());
