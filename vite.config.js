import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5180, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
});
