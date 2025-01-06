import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // server: {
  //   host: '0.0.0.0', // Makes the server accessible on the local network
  //   port: 3000,       // Port number (default is 3000)
  // },
});
