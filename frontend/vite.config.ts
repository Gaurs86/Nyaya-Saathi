import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/analyze': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/feedback': 'http://127.0.0.1:8000',
      '/districts.csv': 'http://127.0.0.1:8000',
      '/review/summary': 'http://127.0.0.1:8000',
      '/review/cases': 'http://127.0.0.1:8000',
    },
  },
})
