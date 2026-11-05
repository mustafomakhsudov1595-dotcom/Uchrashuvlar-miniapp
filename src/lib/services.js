import { toISODate } from './dates.js';
import { daysBetween } from './projects.js';

export const addMonths = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, m - 1 + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return toISODate(new Date(t.getFullYear(), t.getMonth(), Math.min(d, last)));
};
export const serviceEnd = (x) => addMonths(x.doneAt, x.months);
export const serviceDays = (x, today) => daysBetween(today, serviceEnd(x));
// Servis davrining oʻtgan ulushi (0..1)
export const serviceElapsed = (x, today) => {
  const total = daysBetween(x.doneAt, serviceEnd(x)) || 1;
  return Math.min(1, Math.max(0, daysBetween(x.doneAt, today) / total));
};
export const svKind = (d) => (d < 0 ? 'over' : d <= 30 ? 'soon' : 'ok');
export const digits = (v) => String(v || '').replace(/\D/g, '');
export const tgPhoneLink = (phone) => (digits(phone).length >= 9 ? `https://t.me/+${digits(phone)}` : '');
export const fullUrl = (u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `https://${u}`);
export function matchService(x, q) {
  const low = q.trim().toLowerCase();
  if (!low) return true;
  const dg = digits(q);
  return [x.name, x.client, x.url, x.notes].some((v) => v.toLowerCase().includes(low)) || (dg.length >= 3 && digits(x.phone).includes(dg));
}
