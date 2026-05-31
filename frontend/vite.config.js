import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8001', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8001', ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-xterm': ['xterm', 'xterm-addon-fit', 'xterm-addon-web-links'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['zustand', 'axios'],
        },
      },
    },
  },
})
