import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Stable (unhashed) filenames so re-uploading to APEX Static Application
    // Files on every deploy replaces the same file instead of needing the
    // page HTML updated with a new hash each time.
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})
