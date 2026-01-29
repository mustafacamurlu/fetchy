const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

let mainWindow;
let customHomeDirectory = null;

// Get the preferences file path (always in userData)
function getPreferencesFilePath() {
  return path.join(app.getPath('userData'), 'preferences.json');
}

// Load preferences from userData
function loadPreferences() {
  try {
    const prefsPath = getPreferencesFilePath();
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  return { homeDirectory: null, theme: 'dark', autoSave: true, maxHistoryItems: 100 };
}

// Save preferences to userData
function savePreferences(preferences) {
  try {
    const prefsPath = getPreferencesFilePath();
    fs.writeFileSync(prefsPath, JSON.stringify(preferences, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving preferences:', error);
    return false;
  }
}

// Get the effective data directory (custom home or default)
function getEffectiveDataDirectory() {
  if (customHomeDirectory && fs.existsSync(customHomeDirectory)) {
    return customHomeDirectory;
  }
  return path.join(app.getPath('userData'), 'data');
}

// Initialize home directory from preferences
function initializeHomeDirectory() {
  const prefs = loadPreferences();
  if (prefs.homeDirectory && fs.existsSync(prefs.homeDirectory)) {
    customHomeDirectory = prefs.homeDirectory;
  }
}

function createWindow() {
  // Initialize home directory from saved preferences
  initializeHomeDirectory();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    frame: true,
    backgroundColor: '#1a1a2e',
  });

  // Load the app
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

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

// IPC handlers for file operations
ipcMain.handle('open-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'All Files', extensions: ['*'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'YAML Files', extensions: ['yaml', 'yml'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
  }
  return null;
});

ipcMain.handle('save-file', async (event, { content, defaultPath, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: filters || [
      { name: 'JSON Files', extensions: ['json'] },
    ],
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return result.filePath;
  }
  return null;
});

// Get data directory path for storing collections
ipcMain.handle('get-data-path', () => {
  const dataPath = getEffectiveDataDirectory();
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
});

// Read data from file
ipcMain.handle('read-data', async (event, filename) => {
  try {
    const dataPath = path.join(getEffectiveDataDirectory(), filename);
    if (fs.existsSync(dataPath)) {
      return fs.readFileSync(dataPath, 'utf-8');
    }
    return null;
  } catch (error) {
    console.error('Error reading data:', error);
    return null;
  }
});

// Write data to file
ipcMain.handle('write-data', async (event, { filename, content }) => {
  try {
    const dataDir = getEffectiveDataDirectory();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dataPath = path.join(dataDir, filename);
    fs.writeFileSync(dataPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
  }
});

// Get app preferences
ipcMain.handle('get-preferences', () => {
  return loadPreferences();
});

// Save app preferences
ipcMain.handle('save-preferences', async (event, preferences) => {
  const success = savePreferences(preferences);
  if (success && preferences.homeDirectory) {
    customHomeDirectory = preferences.homeDirectory;
  }
  return success;
});

// Select home directory
ipcMain.handle('select-home-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Home Directory for Fetchy Data',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Get current home directory
ipcMain.handle('get-home-directory', () => {
  return customHomeDirectory || path.join(app.getPath('userData'), 'data');
});

// Migrate data to new home directory
ipcMain.handle('migrate-data', async (event, { oldPath, newPath }) => {
  try {
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true });
    }

    // Copy all files from old path to new path
    if (fs.existsSync(oldPath)) {
      const files = fs.readdirSync(oldPath);
      for (const file of files) {
        const srcPath = path.join(oldPath, file);
        const destPath = path.join(newPath, file);
        const stat = fs.statSync(srcPath);

        if (stat.isFile()) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error migrating data:', error);
    return false;
  }
});

// HTTP request handler - makes requests from main process to bypass CORS
ipcMain.handle('http-request', async (event, { url, method, headers, body }) => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: headers || {},
        rejectUnauthorized: false, // Allow self-signed certificates
      };

      const req = httpModule.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const endTime = Date.now();
          const responseBody = Buffer.concat(chunks).toString('utf-8');

          // Convert headers to plain object
          const responseHeaders = {};
          for (const [key, value] of Object.entries(res.headers)) {
            responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
          }

          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: responseHeaders,
            body: responseBody,
            time: endTime - startTime,
            size: Buffer.byteLength(responseBody, 'utf-8'),
          });
        });
      });

      req.on('error', (error) => {
        const endTime = Date.now();

        // Map common error codes to user-friendly status texts
        let statusText = 'Network Error';
        if (error.code === 'ENOTFOUND') {
          statusText = 'DNS Lookup Failed';
        } else if (error.code === 'ECONNREFUSED') {
          statusText = 'Connection Refused';
        } else if (error.code === 'ECONNRESET') {
          statusText = 'Connection Reset';
        } else if (error.code === 'ETIMEDOUT') {
          statusText = 'Connection Timed Out';
        } else if (error.code === 'CERT_HAS_EXPIRED') {
          statusText = 'Certificate Expired';
        } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          statusText = 'SSL Certificate Error';
        }

        resolve({
          status: 0,
          statusText: statusText,
          headers: {},
          body: JSON.stringify({
            error: error.message,
            code: error.code,
            details: `Network error: ${error.code || 'UNKNOWN'} - ${error.message}`
          }, null, 2),
          time: endTime - startTime,
          size: 0,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = Date.now();
        resolve({
          status: 0,
          statusText: 'Timeout',
          headers: {},
          body: JSON.stringify({ error: 'Request timed out' }),
          time: endTime - startTime,
          size: 0,
        });
      });

      // Set timeout (30 seconds)
      req.setTimeout(30000);

      // Send body if present
      if (body) {
        req.write(body);
      }

      req.end();
    } catch (error) {
      const endTime = Date.now();
      resolve({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: JSON.stringify({
          error: error.message,
          details: 'Failed to create request'
        }),
        time: endTime - startTime,
        size: 0,
      });
    }
  });
});
