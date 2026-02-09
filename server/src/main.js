const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const localConfig = require(path.join(__dirname, '..', 'config.json'));

let win;

function getSharedConfigPath() {
  return path.join(localConfig.sharedFolder, 'config.json');
}

function readSharedConfig() {
  const p = getSharedConfigPath();
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { }
  }
  return {
    version: 1,
    globalSlideDuration: 10000,
    schedule: { enabled: false, startTime: '08:00', endTime: '18:00', days: ['Mon','Tue','Wed','Thu','Fri'] },
    files: [],
  };
}

function writeSharedConfig(config) {
  const folder = localConfig.sharedFolder;
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(getSharedConfigPath(), JSON.stringify(config, null, 2));
}

function scanPptxFiles() {
  const folder = localConfig.sharedFolder;
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'))
    .sort();
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'GloTv Server',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-shared-folder', () => localConfig.sharedFolder);

  ipcMain.handle('get-config', () => readSharedConfig());

  ipcMain.handle('save-config', (_e, config) => {
    writeSharedConfig(config);
    return true;
  });

  ipcMain.handle('scan-files', () => scanPptxFiles());

  ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (result.canceled) return null;
    localConfig.sharedFolder = result.filePaths[0];
    fs.writeFileSync(path.join(__dirname, '..', 'config.json'), JSON.stringify(localConfig, null, 2));
    return localConfig.sharedFolder;
  });
});

app.on('window-all-closed', () => app.quit());
