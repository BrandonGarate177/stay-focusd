// Preload script (optional, for secure context bridging)
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  uploadImage: async (blob, endpoint) => {
    // Convert Blob to ArrayBuffer for sending through IPC
    const arrayBuffer = await blob.arrayBuffer();

    // Send the data to the main process for handling
    return ipcRenderer.invoke('upload-image', {
      buffer: arrayBuffer,
      endpoint: endpoint
    });
  },

  // Storage API methods
  startSession: async (sessionConfig) => {
    return ipcRenderer.invoke('start-session', sessionConfig);
  },

  addLogEntry: async (sessionId, entry) => {
    return ipcRenderer.invoke('add-log-entry', { sessionId, entry });
  },

  endSession: async (sessionId) => {
    return ipcRenderer.invoke('end-session', sessionId);
  },

  searchSessions: async (searchParams) => {
    return ipcRenderer.invoke('search-sessions', searchParams);
  },

  getStorageStats: async () => {
    return ipcRenderer.invoke('get-storage-stats');
  },

  // Set the maximum number of sessions to keep
  setMaxSessions: async (maxSessions) => {
    return ipcRenderer.invoke('set-max-sessions', maxSessions);
  },

  // Storage location selection methods
  selectStoragePath: async () => {
    return ipcRenderer.invoke('select-storage-path');
  },

  getStoragePath: async () => {
    return ipcRenderer.invoke('get-storage-path');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  // You can expose APIs here if needed
});
