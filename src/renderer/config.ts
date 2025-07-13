const REMOTE_BASE = 'https://focusd-lamp-126402297095.us-west1.run.app';

// In development use Vite proxy (relative paths), in production use remote endpoints
export const config = {
    uploadEndpoint: import.meta.env.DEV ? '/upload' : `${REMOTE_BASE}/upload`,
    analyzeEndpoint: import.meta.env.DEV ? '/analyze' : `${REMOTE_BASE}/analyze`,
};



