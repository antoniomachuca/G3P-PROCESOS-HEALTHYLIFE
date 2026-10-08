import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // La interfaz habla con la API; no importa el JSON de semilla.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
