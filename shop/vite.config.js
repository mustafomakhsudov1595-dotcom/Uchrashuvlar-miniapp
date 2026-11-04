import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './' -> GitHub Pages / istalgan papkadan ishlaydi
export default defineConfig({ base: './', plugins: [react()], server: { host: true, port: 5174, allowedHosts: true } });
