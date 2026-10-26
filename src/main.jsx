import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/sora';
import './styles.css';
import App from './App.jsx';
import { initTelegram } from './lib/telegram.js';
import { initTheme } from './lib/theme.js';

initTelegram();
initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
