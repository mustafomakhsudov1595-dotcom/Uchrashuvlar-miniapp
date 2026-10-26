import { useSyncExternalStore } from 'react';

// Mavzu: rejim (avto / yorug' / qorong'u) va asosiy rang. Brauzerda saqlanadi.
export const ACCENTS = ['teal', 'blue', 'violet', 'rose', 'green'];
export const MODES = ['auto', 'light', 'dark'];
const MODE_KEY = 'uchrashuvlar:mode';
const ACC_KEY = 'uchrashuvlar:accent';
const BG = { light: '#F4F7FC', dark: '#070D1A' };

const read = (k, ok, d) => {
  try {
    const v = localStorage.getItem(k);
    return ok.includes(v) ? v : d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

let state = { mode: read(MODE_KEY, MODES, 'auto'), accent: read(ACC_KEY, ACCENTS, 'teal') };
const subs = new Set();
const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
const inTg = Boolean(tg?.initData);

function resolved() {
  if (state.mode !== 'auto') return state.mode;
  if (inTg && tg.colorScheme) return tg.colorScheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme() {
  const theme = resolved();
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.accent = state.accent;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[theme]);
  if (!inTg) return;
  try {
    if (tg.isVersionAtLeast?.('6.9')) tg.setHeaderColor(BG[theme]);
    if (tg.isVersionAtLeast?.('6.1')) tg.setBackgroundColor(BG[theme]);
    if (tg.isVersionAtLeast?.('7.10')) tg.setBottomBarColor(BG[theme]);
  } catch {
    /* eski Telegram */
  }
}

export function initTheme() {
  applyTheme();
  if (inTg) tg.onEvent?.('themeChanged', applyTheme);
  else window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
}

const emit = () => subs.forEach((f) => f());
export function setMode(mode) {
  if (!MODES.includes(mode)) return;
  state = { ...state, mode };
  write(MODE_KEY, mode);
  applyTheme();
  emit();
}
export function setAccent(accent) {
  if (!ACCENTS.includes(accent)) return;
  state = { ...state, accent };
  write(ACC_KEY, accent);
  applyTheme();
  emit();
}
export const getTheme = () => state;
export const useTheme = () => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, getTheme);
