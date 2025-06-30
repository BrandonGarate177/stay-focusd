import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current directory and parent directories
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: __dirname,
    plugins: [react()],
    build: {
      outDir: '../../dist',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    // Ensure env variables are properly loaded
    define: {
      'import.meta.env': JSON.stringify(env),
    },
  };
});
