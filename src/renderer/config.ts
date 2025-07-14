const REMOTE_BASE = import.meta.env.VITE_REMOTE_BASE;

// In development use Vite proxy (relative paths), in production use remote endpoints
export const config = {
    uploadEndpoint: import.meta.env.DEV ? '/upload' : `${REMOTE_BASE}/upload`,
    analyzeEndpoint: import.meta.env.DEV ? '/analyze' : `${REMOTE_BASE}/analyze`,
};



