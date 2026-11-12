import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/sora';
import './styles.css';
import './premium.css';
import App from './App.jsx';
import { initTelegram } from './lib/telegram.js';
import { initTheme } from './lib/theme.js';

initTelegram();
initTheme();

// Oflayn rejim uchun xizmat ishchisi (faqat ishlab chiqarishda)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
