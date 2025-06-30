// TypeScript declaration for Electron API
interface ElectronAPI {
  uploadImage: (blob: Blob, endpoint: string) => Promise<any>;
}

interface Window {
  electronAPI: ElectronAPI;
}
