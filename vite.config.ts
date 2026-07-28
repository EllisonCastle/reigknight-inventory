import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Native fs.watch doesn't work reliably over network/mapped drives (this
    // project lives on a mapped SMB share), so fall back to polling.
    watch: {
      usePolling: true,
    },
  },
})
