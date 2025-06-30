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
  }
});

window.addEventListener('DOMContentLoaded', () => {
  // You can expose APIs here if needed
});
