import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: {
  chunkSizeWarningLimit: 1300,
  rollupOptions: { input: { home: 'index.html', services: 'services/index.html', ...Object.fromEntries(['brand-films', 'weddings-events', 'work', 'about', 'contact'].map(page => [page, page + '/index.html'])) } },
} });
