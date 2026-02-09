import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.cjs',
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://frontend-api:5001',
        changeOrigin: true,
      },
    },
  },
})
