import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // This tells Vite to handle page refreshes on sub-routes gracefully
    historyApiFallback: true,
  }
})