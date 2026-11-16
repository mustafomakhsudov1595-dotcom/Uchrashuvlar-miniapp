// Botga rasm yuborib mahsulot qo'shish: rasm + izoh "Nomi | Narxi | Soni | Hajmi"
const CAT_WORDS = [
  ['lamp', /lamp|lampoch|\bled\b|veral/i], ['duracell', /duracell|durasel/i], ['raketa', /raketa/i], ['soni', /\bsoni\b|\bconi\b/i],
  ['laundry', /ariel|kopum|yumsa|kir yuv|kukun|persil|tide|kapsula|yumshat|kondits/i], ['pipes', /quvur|zasor|biotaf|tornado/i],
  ['sponge', /gubka|gupka|viva|euro ?house/i], ['air', /havo|fresher|air ?smart|osvej/i], ['glue', /yelim|tuzoq|glue/i], ['razor', /ustara|razor|hong ?long/i],
];
const esc = (t) => String(t).replace(/[<>&]/g, '');

export const HELP = `📸 <b>Mahsulot qo'shish</b>\n\nBotga <b>rasm</b> yuboring va rasm tagiga (izohga) shunday yozing:\n\n<code>Nomi | Narxi | Ombordagi soni | Hajmi</code>\n\nMisol:\n<code>Persil gel 3 kg | 85000 | 20 | 3 kg</code>\n\nFaqat nom va narx ham yetadi:\n<code>Persil gel 3 kg | 85000</code>\n\nMahsulot do'konda darrov paydo bo'ladi ✅`;

export const num = (s) => {
  const t = String(s ?? '');
  let n = parseInt(t.replace(/[^\d]/g, ''), 10);
  if (!n) return 0;
  if (/(^|\s)(k|ming|минг)\b|\d\s?k\b/i.test(t) && n < 1000) n *= 1000;
  return n;
};

export function parseCaption(text) {
  const t = String(text || '').trim();
  let parts;
  if (/[|;\n]/.test(t)) parts = t.split(/[|;\n]/).map((x) => x.trim()).filter(Boolean);
  else {
    // "Persil gel 3 kg 85000" yoki "Persil - 85 000 so'm": oxirgi raqam — narx
    const m = t.match(/^(.*?)[\s:–—-]+(\d[\d\s.,]*\s?(?:k|ming|минг|so'?m|сум)?)\s*$/i);
    parts = m && /\d{3}|k|ming/i.test(m[2]) ? [m[1].trim(), m[2].trim()] : [t];
  }
  const name = (parts[0] || '').replace(/[:\-–—\s]+$/, '').slice(0, 120);
  const price = num(parts[1]);
  const stock = parts[2] !== undefined && /\d/.test(parts[2]) ? num(parts[2]) : null;
  const size = (parts[3] || '').slice(0, 40);
  return { name, price, stock, size };
}

const b64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x1000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x1000)); return btoa(s); };

// ro'yxat ichidan eng yaxshi (katta lekin yengil) rasm
function pickPhoto(photos) {
  const sorted = [...photos].sort((a, b) => (a.file_size || 0) - (b.file_size || 0));
  const ok = sorted.filter((p) => (p.file_size || 0) <= 900000 && Math.max(p.width, p.height) <= 1300);
  return ok[ok.length - 1] || sorted[0];
}

async function createProduct(env, photos, caption, parsed) {
  const { name, price, stock, size } = parsed;
  const custom = (await env.KV.get('custom', 'json')) || [];
  const dup = custom.find((c) => c.name.toLowerCase() === name.toLowerCase() && c.price === price && Date.now() - (c.created || 0) < 5 * 60e3);
  if (dup) return { text: `ℹ️ <b>${esc(dup.name)}</b> allaqachon qo'shilgan (ID ${dup.id}). Ikkinchi marta qo'shilmadi.`, id: dup.id };

  const p = pickPhoto(photos);
  const f = await (await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(p.file_id)}`)).json();
  if (!f.ok) return { text: "❗ Rasmni yuklab bo'lmadi, qayta yuboring." };
  const r = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`);
  const buf = await r.arrayBuffer();
  if (!r.ok || buf.byteLength > 1_100_000) return { text: "❗ Rasm juda katta, kichikroq rasm yuboring." };

  const id = Math.max(1000, ...custom.map((c) => c.id + 1));
  const cat = (CAT_WORDS.find(([, re]) => re.test(`${name} ${caption || ''}`)) || ['other'])[0];
  await env.KV.put(`img:${id}`, b64(buf));
  const item = { id, name, cat, size, price, desc: '', hit: false, isNew: true, hidden: false, img: `/api/img/${id}?v=${Date.now()}`, created: Date.now() };
  if (stock !== null) item.stock = stock;
  custom.push(item);
  await env.KV.put('custom', JSON.stringify(custom));
  return {
    id,
    text: `✅ <b>Mahsulot qo'shildi!</b>\n\n📦 ${esc(name)}\n💰 ${price.toLocaleString('ru-RU')} so'm${size ? '\n📏 ' + esc(size) : ''}${stock !== null ? '\n🗄 Omborda: ' + stock + ' ta' : ''}\n🗂 Bo'lim: ${cat}\n\nDo'konda darrov ko'rinadi. Xato bo'lsa, pastdagi tugma bilan o'chiring.`,
  };
}

// Admin rasm yubordi. Izoh to'g'ri bo'lsa — darrov qo'shiladi; bo'lmasa rasmni eslab, nom va narxni kutadi.
export async function addProductFromPhoto(env, m) {
  const photos = m.photo || [];
  if (!photos.length) return { text: "❗ Rasmni <b>«Siqilgan»</b> (oddiy rasm) holida yuboring, fayl sifatida emas.\n\n" + HELP };
  // admin ilovadagi «Botdan rasm olish» uchun oxirgi rasmni 1 soat saqlaymiz
  await env.KV.put(`lp:${m.chat.id}`, JSON.stringify({ file_id: pickPhoto(photos).file_id, ts: Date.now() }), { expirationTtl: 3700 });
  const parsed = parseCaption(m.caption);
  if (parsed.name && parsed.price > 0) return createProduct(env, photos, m.caption, parsed);
  await env.KV.put(`pend:${m.chat.id}`, JSON.stringify({ photos, ts: Date.now() }), { expirationTtl: 900 });
  return { text: "📸 <b>Rasm qabul qilindi.</b>\n\nEndi shu yerga mahsulot <b>nomi va narxini</b> yozing:\n\n<code>Persil gel 3 kg | 85000</code>\n\n(Ombordagi sonini ham yozsangiz bo'ladi: <code>Persil | 85000 | 20</code>)\n\nYoki admin ilovada <b>Mahsulot → Mahsulot qo'shish → «Botdan rasm olish»</b> ni bosing.", waiting: true };
}

// Admin oddiy matn yubordi: agar oldin rasm yuborgan bo'lsa — shu rasm bilan mahsulot yaratamiz
export async function addProductFromText(env, m) {
  const pend = await env.KV.get(`pend:${m.chat.id}`, 'json');
  if (!pend) return null;
  const parsed = parseCaption(m.text);
  if (!parsed.name || !(parsed.price > 0)) return { text: "❗ Nom va narxni shunday yozing:\n<code>Persil gel 3 kg | 85000</code>", waiting: true };
  await env.KV.delete(`pend:${m.chat.id}`);
  return createProduct(env, pend.photos, m.text, parsed);
}

export async function deleteCustom(env, id) {
  if (!(id >= 1000)) return false;
  const custom = ((await env.KV.get('custom', 'json')) || []).filter((c) => c.id !== id);
  await env.KV.put('custom', JSON.stringify(custom));
  await env.KV.delete(`img:${id}`);
  return true;
}
