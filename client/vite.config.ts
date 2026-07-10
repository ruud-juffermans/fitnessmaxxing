import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // Must match the platform server's FITNESS_URL default (CORS allowlist).
    port: 3000,
    watch: { usePolling: true },
    // No /api proxy: the client calls the platform API (VITE_API_URL) by
    // absolute URL; the legacy in-repo server is no longer used.
  },
});
