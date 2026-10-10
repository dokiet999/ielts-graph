/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Shared sample exercises live outside the frontend (../data) and are used as mock fixtures.
      '@data': path.resolve(__dirname, '../data'),
    },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      // Used when mocks are disabled (VITE_USE_MOCK=false) and the Spring Boot backend runs locally.
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['@tanstack/react-query', 'axios', 'zustand', 'zod', 'react-hook-form'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            'lucide-react',
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
