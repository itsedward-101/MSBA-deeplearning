import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://resonate-gargle-common.ngrok-free.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'X-Requested-With': 'XMLHttpRequest'
        },
      }
    }
  }
})
