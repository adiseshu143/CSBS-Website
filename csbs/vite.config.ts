import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Firebase into its own chunk (~110 kB)
          'firebase-core': ['firebase/app', 'firebase/auth'],
          // Firestore loaded eagerly for data fetching (~200 kB)
          'firebase-firestore': ['firebase/firestore'],
          // Storage loaded lazily only when uploads are needed
          'firebase-storage': ['firebase/storage'],
          // Split React + Router into a vendor chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
