import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite configuration for the renderer process
export default defineConfig({
    plugins: [react()],
    root: path.resolve(__dirname, 'src/renderer'),
    base: './',
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        strictPort: true, // Ensures Vite fails if 5173 is not available
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});