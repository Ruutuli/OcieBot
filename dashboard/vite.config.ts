import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use /OcieBot/ base path for GitHub Pages, / for local development
const base = process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/OcieBot/' : '/');

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})

