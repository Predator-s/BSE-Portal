import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy the REST API to the portal server so the browser uses one origin for HTTP.
// The WebSocket connects directly to the server (see LiveContext) — proxying it
// through Vite produces noisy `write EPIPE` logs when sockets close.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4002', changeOrigin: true },
    },
  },
});
