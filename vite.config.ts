import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
          maplibre: ['maplibre-gl', '@mapbox/mapbox-gl-draw'],
          turf: ['@turf/turf'],
          flexsearch: ['flexsearch'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
