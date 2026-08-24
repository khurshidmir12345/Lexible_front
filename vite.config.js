import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The frontend is its own repository and its own deployment: it builds into
// `dist/`, and nginx serves that directory at /app-assets. The backend only
// reads the manifest to learn the hashed filenames.
export default defineConfig({
  plugins: [vue()],
  base: '/app-assets/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: 'src/main.js',
    },
  },
  server: {
    port: 5173,
    proxy: {
      // `npm run dev` talks to a locally running Laravel.
      '/api': 'http://127.0.0.1:8123',
    },
  },
})
