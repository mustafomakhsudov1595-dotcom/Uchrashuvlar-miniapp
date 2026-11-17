// Valyuta: hamyonlar (naqd, karta — soʻm; usd — dollar) va kunlik kurs (Markaziy bank, server beradi).
export const WALLETS = ['cash', 'card', 'usd'];
export const rnd = (n, usd) => (usd ? Math.round(n * 100) / 100 : Math.round(n));

const FX_KEY = 'uchrashuvlar:fx:v1';
let RATE = 0;
export const setRate = (r) => { RATE = Number(r) > 1000 ? Number(r) : 0; };
export const getRate = () => RATE;
export function loadFx() {
  try {
    const d = JSON.parse(localStorage.getItem(FX_KEY) || '{}');
    return { usd: Number(d.usd) > 1000 ? Number(d.usd) : 0, d: typeof d.d === 'string' ? d.d : '' };
  } catch {
    return { usd: 0, d: '' };
  }
}
export function saveFx(fx) {
  try { localStorage.setItem(FX_KEY, JSON.stringify(fx)); } catch { /* ignore */ }
}

const group = (i) => String(i).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const fmtUsd = (n) => {
  const [i, d] = rnd(Math.abs(n), true).toFixed(2).split('.');
  return `${n < 0 ? '−' : ''}$${group(i)}${d === '00' ? '' : `.${d}`}`;
};
export const fmtUzs = (n) => `${n < 0 ? '−' : ''}${group(Math.round(Math.abs(n)))}`;
// summa hamyon valyutasida
export const fmtW = (w, n) => (w === 'usd' ? fmtUsd(n) : fmtUzs(n));
// dollarni soʻmga (kurs boʻyicha), soʻm hamyonlari oʻz holicha
export const toUzs = (a, w) => (w === 'usd' ? a * RATE : a);
// toʻlov (qarz) summasi valyutasi bilan
export const fmtPay = (x, n) => (x && x.cu === 'USD' ? fmtUsd(n) : fmtUzs(n));
