const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let settingsPath;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'server-settings.json');
}

function loadSettings() {
  settingsPath = getSettingsPath();
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading settings:', err.message);
  }
  return { slidesFolder: '' };
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function loadConfig(slidesFolder) {
  const configPath = path.join(slidesFolder, 'glotv-config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading config:', err.message);
  }
  return {
    slideDuration: 10,
    schedule: { startHour: 7, endHour: 19 },
    transition: 'crossfade',
    files: [],
  };
}

function saveConfig(slidesFolder, config) {
  const configPath = path.join(slidesFolder, 'glotv-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function scanPptxFiles(slidesFolder) {
  if (!slidesFolder || !fs.existsSync(slidesFolder)) return [];
  try {
    return fs.readdirSync(slidesFolder)
      .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'))
      .sort();
  } catch (err) {
    console.error('Error scanning folder:', err.message);
    return [];
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#1a1a2e',
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

  ipcMain.handle('get-settings', () => loadSettings());

  ipcMain.handle('browse-folder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Shared Drive Folder',
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('save-settings', (_e, settings) => {
    saveSettings(settings);
    return true;
  });

  ipcMain.handle('load-config', (_e, slidesFolder) => {
    return loadConfig(slidesFolder);
  });

  ipcMain.handle('save-config', (_e, slidesFolder, config) => {
    saveConfig(slidesFolder, config);
    return true;
  });

  ipcMain.handle('scan-files', (_e, slidesFolder) => {
    return scanPptxFiles(slidesFolder);
  });
});

app.on('window-all-closed', () => app.quit());
