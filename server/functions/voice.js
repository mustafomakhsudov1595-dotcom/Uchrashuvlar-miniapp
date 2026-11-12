'use strict';
// Ovozli xabarni matnga aylantiradi (Cloudflare Workers AI · Whisper)
const S = require('./_shared');
const { getAI } = require('../kv');

const CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: 'ʼ', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'oʻ', қ: 'q', ғ: 'gʻ', ҳ: 'h' };
// Oʻzbekcha kirill matnni lotinga oʻtkazadi (parser lotin harflarini kutadi)
const toLatin = (t) => t.replace(/[А-Яа-яЁёЎўҚқҒғҲҳ]/g, (c) => { const l = CYR[c.toLowerCase()] || c; return c === c.toLowerCase() ? l : l.charAt(0).toUpperCase() + l.slice(1); });
const PROMPT = { uz: 'Ertaga soat 15:00 da Anvar bilan uchrashuv, Chilonzor.', ru: 'Завтра в 15:00 встреча с Анваром.', en: 'Tomorrow at 3 pm meeting with Anvar.' };

function b64(buf) {
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
// { text } | { error: 'long' | 'fail' }
async function transcribe(voice, lang) {
  const AI = getAI();
  if (!AI) return { error: 'fail' };
  if ((voice.duration || 0) > 90 || (voice.file_size || 0) > 3e6) return { error: 'long' };
  try {
    const f = await S.tg('getFile', { file_id: voice.file_id });
    if (!f.ok) return { error: 'fail' };
    const r = await fetch(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${f.result.file_path}`);
    if (!r.ok) return { error: 'fail' };
    const out = await AI.run('@cf/openai/whisper-large-v3-turbo', { audio: b64(new Uint8Array(await r.arrayBuffer())), language: lang, initial_prompt: PROMPT[lang] });
    let text = String((out && out.text) || '').trim();
    if (lang === 'uz') text = toLatin(text);
    return { text };
  } catch (e) { console.error('voice', e.message); return { error: 'fail' }; }
}
module.exports = { transcribe, toLatin, b64 };
