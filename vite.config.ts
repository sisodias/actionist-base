import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4179,
    strictPort: true,
    proxy: {
      '/knowledge-module': {
        target: 'http://127.0.0.1:4601',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/knowledge-module/, ''),
      },
      '/knowledge-backend': {
        target: 'http://127.0.0.1:3012',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/knowledge-backend/, ''),
      },
      '/knowledge-issuer': {
        target: 'http://127.0.0.1:4320',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/knowledge-issuer/, ''),
      },
    },
  },
});
