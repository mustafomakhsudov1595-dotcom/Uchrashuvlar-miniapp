// Telegram Mini App initData'ni tekshirish (HMAC). Foydalanuvchini soxtalashtirib bo'lmaydi.
export async function verifyInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const enc = new TextEncoder();
  const hmac = async (key, msg) => {
    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
  };
  const secret = await hmac(enc.encode('WebAppData'), botToken);
  const sig = [...(await hmac(secret, dcs))].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (sig !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 7 * 86400) return null;
  try { return JSON.parse(p.get('user')); } catch { return null; }
}
