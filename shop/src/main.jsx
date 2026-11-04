import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import App from './App.jsx';
import './styles.css';

const tg = window.Telegram?.WebApp;
const dark = tg ? tg.colorScheme === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = dark ? 'dark' : 'light';
if (tg) {
  tg.ready(); tg.expand();
  try { const c = dark ? '#0B1020' : '#F3F5FA'; tg.setHeaderColor(c); tg.setBackgroundColor(c); tg.setBottomBarColor?.(c); } catch {}
}
createRoot(document.getElementById('root')).render(<App />);
