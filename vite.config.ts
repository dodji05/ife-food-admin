import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    build: {
      sourcemap: false,
    },
    server: {
      port: 3001,
      proxy: {
        '/api': { target: backendUrl, changeOrigin: true },
        '/socket.io': { target: backendUrl, ws: true },
      },
    },
  }
})
