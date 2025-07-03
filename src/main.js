const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { URL } = require('url');
// Import StorageService from JavaScript file
const { StorageService } = require('./main/storage/StorageService.js');

const isDev = !app.isPackaged;
// Initialize storage service
let storageService;
// Store user preferences
let userPreferences = {
  storagePath: null
};

// Path to user preferences file
const userPrefsPath = path.join(app.getPath('userData'), 'preferences.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // Optional: open dev tools automatically
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Handle image upload from the renderer process
ipcMain.handle('upload-image', async (event, { buffer, endpoint }) => {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(endpoint);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      // Write buffer to a temporary file
      const tempFilePath = path.join(app.getPath('temp'), 'frame.jpg');
      fs.writeFileSync(tempFilePath, Buffer.from(buffer));

      console.log(`Saved temporary file to: ${tempFilePath}`);
      console.log(`File size: ${fs.statSync(tempFilePath).size} bytes`);

      // Read the file as a stream
      const fileStream = fs.createReadStream(tempFilePath);

      // Create a boundary for multipart/form-data
      const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2);

      // Build the multipart/form-data request
      const boundaryStart = `--${boundary}\r\n`;
      // Changed name from "file" to "image" to match backend expectations
      const contentDisposition = 'Content-Disposition: form-data; name="image"; filename="frame.jpg"\r\n';
      const contentType = 'Content-Type: image/jpeg\r\n\r\n';
      const boundaryEnd = `\r\n--${boundary}--\r\n`;

      // Get the file size for Content-Length calculation
      const fileSize = fs.statSync(tempFilePath).size;
      const headerSize = Buffer.byteLength(boundaryStart + contentDisposition + contentType);
      const footerSize = Buffer.byteLength(boundaryEnd);
      const contentLength = headerSize + fileSize + footerSize;

      // Setup the request options
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': contentLength
        }
      };

      console.log(`Making request to ${endpoint}`);
      console.log(`Headers: ${JSON.stringify(options.headers)}`);

      const req = protocol.request(options, (res) => {
        let data = '';

        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response headers: ${JSON.stringify(res.headers)}`);

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`Response data: ${data}`);

          // Clean up the temp file
          fs.unlink(tempFilePath, (err) => {
            if (err) console.error('Error deleting temp file:', err);
          });

          try {
            const jsonResponse = JSON.parse(data);
            resolve(jsonResponse);
          } catch (error) {
            console.error('Failed to parse response:', error);
            reject({ error: 'Failed to parse response', details: error.message, rawResponse: data });
          }
        });
      });

      req.on('error', (error) => {
        console.error('Request error:', error);

        // Clean up the temp file on error
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('Error deleting temp file on request error:', err);
        });

        reject({ error: 'Request failed', details: error.message });
      });

      // Write the multipart form header
      req.write(boundaryStart);
      req.write(contentDisposition);
      req.write(contentType);

      // Stream the file data
      fileStream.on('data', (chunk) => {
        req.write(chunk);
      });

      fileStream.on('end', () => {
        // Write the closing boundary and end the request
        req.write(boundaryEnd);
        req.end();
      });

      fileStream.on('error', (err) => {
        console.error('Error reading file stream:', err);
        req.destroy();
        reject({ error: 'File stream error', details: err.message });

        // Clean up the temp file on stream error
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temp file on stream error:', unlinkErr);
        });
      });

    } catch (error) {
      console.error('Exception in upload-image handler:', error);
      reject({ error: 'Failed to send request', details: error.message });
    }
  });
});

// Load user preferences from file
function loadUserPreferences() {
  try {
    if (fs.existsSync(userPrefsPath)) {
      const data = fs.readFileSync(userPrefsPath);
      userPreferences = JSON.parse(data);
      console.log('User preferences loaded:', userPreferences);
    } else {
      console.log('No user preferences file found, using defaults');
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
}

// Save user preferences to file
function saveUserPreferences() {
  try {
    fs.writeFileSync(userPrefsPath, JSON.stringify(userPreferences, null, 2));
    console.log('User preferences saved:', userPreferences);
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

app.whenReady().then(() => {
  // First load user preferences
  loadUserPreferences();

  // Initialize storage service with user-selected path if available
  storageService = new StorageService(userPreferences.storagePath);
  console.log('Storage service initialized' + (userPreferences.storagePath ?
    ` with custom path: ${userPreferences.storagePath}` : ' with default path'));

  // Set up IPC handlers for storage operations
  setupStorageIpcHandlers();

  createWindow();
});

// Set up IPC handlers for storage operations
function setupStorageIpcHandlers() {
  // Handle storage path selection
  ipcMain.handle('select-storage-path', async (event) => {
    const result = await dialog.showOpenDialog({
      title: 'Select Storage Location',
      properties: ['openDirectory']
    });

    if (result.canceled) {
      return { success: false, error: 'No directory selected' };
    } else {
      const selectedPath = result.filePaths[0];
      userPreferences.storagePath = selectedPath;
      saveUserPreferences();

      // Re-initialize storage service with the new path
      storageService = new StorageService(selectedPath);
      console.log(`Storage service re-initialized with path: ${selectedPath}`);

      return { success: true, storagePath: selectedPath };
    }
  });

  // Set maximum number of sessions to keep
  ipcMain.handle('set-max-sessions', async (event, maxSessions) => {
    try {
      storageService.setMaxSessions(maxSessions);
      return { success: true };
    } catch (error) {
      console.error('Failed to set max sessions:', error);
      return { success: false, error: error.message };
    }
  });
  // Get current storage path
  ipcMain.handle('get-storage-path', () => {
    return {
      success: true,
      storagePath: userPreferences.storagePath || 'Default location',
      isDefault: !userPreferences.storagePath
    };
  });

  // Start a new focus tracking session
  ipcMain.handle('start-session', async (event, sessionConfig) => {
    try {
      const session = storageService.startSession(sessionConfig);
      return { success: true, session };
    } catch (error) {
      console.error('Failed to start session:', error);
      return { success: false, error: error.message };
    }
  });

  // Add a log entry to current session
  ipcMain.handle('add-log-entry', async (event, { sessionId, entry }) => {
    try {
      const success = storageService.addLogEntry(sessionId, entry);
      return { success };
    } catch (error) {
      console.error('Failed to add log entry:', error);
      return { success: false, error: error.message };
    }
  });

  // End a session
  ipcMain.handle('end-session', async (event, sessionId) => {
    try {
      const success = storageService.endSession(sessionId);
      return { success };
    } catch (error) {
      console.error('Failed to end session:', error);
      return { success: false, error: error.message };
    }
  });

  // Search sessions
  ipcMain.handle('search-sessions', async (event, searchParams) => {
    try {
      const results = storageService.search(searchParams);
      return { success: true, results };
    } catch (error) {
      console.error('Search failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Get storage stats
  ipcMain.handle('get-storage-stats', async () => {
    try {
      const stats = storageService.getStats();
      return { success: true, stats };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { success: false, error: error.message };
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
