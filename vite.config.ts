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
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});