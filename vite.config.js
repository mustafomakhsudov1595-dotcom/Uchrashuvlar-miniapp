import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host: true  -> telefondan ham ochish mumkin (bir xil Wi-Fi tarmog'ida)
// allowedHosts: true -> ngrok / cloudflared kabi vaqtinchalik havolalar ishlaydi
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, allowedHosts: true },
});
