import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const defaultBase = '/';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || defaultBase,
  build: {
    sourcemap: true,
    assetsInlineLimit: 0
  }
});
