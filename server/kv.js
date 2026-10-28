'use strict';
// Netlify Blobs'ga o'xshash minimal qatlam (get / set / setJSON / list) — Cloudflare KV ustida.
// Foydalanuvchilar ro'yxati `idx/users` kalitida saqlanadi: har daqiqalik cron KV list() limitiga urilmasin.
let KV = null;
const setKV = (ns) => { KV = ns; };
const IDX = 'idx/users';

async function readIndex() { return (await KV.get(IDX, { type: 'json' })) || []; }
async function addToIndex(key) {
  const idx = await readIndex();
  if (idx.includes(key)) return;
  idx.push(key);
  await KV.put(IDX, JSON.stringify(idx));
}
async function listAll(prefix) {
  const keys = [];
  let cursor;
  do {
    const r = await KV.list({ prefix, cursor });
    keys.push(...r.keys.map((k) => k.name));
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return keys;
}
// Indeksni soatiga bir marta haqiqiy list() bilan to'g'rilaydi (parallel yozuvlarda yo'qolgan kalitlar uchun).
async function reindex() {
  const keys = await listAll('user/');
  await KV.put(IDX, JSON.stringify(keys));
  return keys;
}

function openKV() {
  if (!KV) throw new Error('KV binding yo\'q');
  return {
    get: (key, opts) => KV.get(key, opts && opts.type === 'json' ? { type: 'json' } : { type: 'text' }),
    set: (key, value) => KV.put(key, String(value)),
    setJSON: async (key, value) => {
      await KV.put(key, JSON.stringify(value));
      if (key.startsWith('user/')) await addToIndex(key);
    },
    list: async ({ prefix } = {}) => {
      if (prefix === 'user/') {
        const hourly = new Date().getUTCMinutes() === 0;
        const keys = hourly ? await reindex() : await readIndex();
        return { blobs: keys.map((key) => ({ key })) };
      }
      return { blobs: (await listAll(prefix)).map((key) => ({ key })) };
    },
  };
}

module.exports = { openKV, setKV };
