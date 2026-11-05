'use strict';
// Servis: tayyor saytlar va 1 yillik xizmat (uz / ru / en)
const left = {
  uz: (d) => (d < 0 ? `⚠️ servis ${-d} kun oldin tugagan` : d === 0 ? '⚠️ servis bugun tugaydi' : d >= 60 ? `${Math.floor(d / 30)} oy ${d % 30} kun qoldi` : `${d} kun qoldi`),
  ru: (d) => (d < 0 ? `⚠️ сервис закончился ${-d} дн. назад` : d === 0 ? '⚠️ сервис заканчивается сегодня' : d >= 60 ? `осталось ${Math.floor(d / 30)} мес. ${d % 30} дн.` : `осталось ${d} дн.`),
  en: (d) => (d < 0 ? `⚠️ service ended ${-d} days ago` : d === 0 ? '⚠️ service ends today' : d >= 60 ? `${Math.floor(d / 30)} mo ${d % 30} d left` : `${d} days left`),
};
const uz = {
  bSvc: '🛠 Servis', svLeft: left.uz, svDoneLbl: 'Topshirilgan', svSvcLbl: 'Servis', svEndLbl: 'tugaydi', svReqLbl: '🔧 Soʻrovlar',
  svTitle: (n, a) => `🛠 <b>Servis</b> (${n}) — faol: ${a}`, svNone: 'Hali sayt qoʻshilmagan. /servis bilan qoʻshing yoki tayyor loyihada “🛠 Servisga” tugmasini bosing.', svSearchNone: (q) => `“${q}” boʻyicha hech narsa topilmadi.`,
  svAsk: '🛠 <b>Yangi servis</b>\n\nBitta xabarda yozing (vergul bilan), tartib muhim emas:\n<code>Kafe Navo, Anvar, +998901234567, kafenavo.uz, https://claude.ai/code/..., 15.10</code>\n\nSayt nomi, mijoz, telefon, sayt havolasi, Claude havolasi, topshirilgan sana (kiritilmasa — bugun). Servis muddati 12 oy.',
  svBad: 'Tushunmadim. Kamida sayt nomini yozing. Masalan: <code>Kafe Navo, Anvar, +998901234567, kafenavo.uz</code>', svSaved: '✅ Servisga qoʻshildi.',
  bSvSite: '🌐 Sayt', bSvClaude: '🤖 Claude', bSvPhone: '📞 Raqamni olish', bSvReq: '➕ Soʻrov', bSvDel: '🗑 Oʻchirish', bSvSetClaude: '🤖 Claude havolasini qoʻshish', bSvSetSite: '🌐 Sayt havolasini qoʻshish',
  svLinkAsk: (l) => `${l} havolasini yuboring:`, svLinkBad: 'Havola notoʻgʻri. https://... koʻrinishida yuboring.', svLinkSaved: '✅ Saqlandi.',
  svReqAsk: '🔧 Mijoz nimani oʻzgartirishni soʻradi? Yozing:', svReqSaved: '✅ Soʻrov yozildi.', svDelAsk: '🗑 Servisni oʻchirasizmi?', svDeleted: '🗑 Oʻchirildi.',
  svRem: (n, c, d, end) => `🛠 <b>${n}</b>${c ? ` · ${c}` : ''} — 1 yillik servis ${d <= 0 ? 'tugadi' : `<b>${d} kun</b>dan keyin tugaydi`} (${end}).\nMijozga pullik xizmat (oylik toʻlov) taklif qiling.`,
  bSvFromProj: '🛠 Servisga qoʻshish', svFromProjDone: '✅ Servisga qoʻshildi. Claude havolasini qoʻshishni unutmang.', cmdSv: '🛠 /servis — tayyor saytlar, servis, Claude havolasi',
};
const ru = {
  ...uz,
  bSvc: '🛠 Сервис', svLeft: left.ru, svDoneLbl: 'Сдан', svSvcLbl: 'Сервис', svEndLbl: 'до', svReqLbl: '🔧 Запросы',
  svTitle: (n, a) => `🛠 <b>Сервис</b> (${n}) — активных: ${a}`, svNone: 'Сайтов пока нет. Добавьте через /servis или нажмите «🛠 В сервис» в готовом проекте.', svSearchNone: (q) => `По запросу «${q}» ничего не найдено.`,
  svAsk: '🛠 <b>Новый сервис</b>\n\nОдним сообщением через запятую, порядок не важен:\n<code>Кафе Навo, Анвар, +998901234567, kafenavo.uz, https://claude.ai/code/..., 15.10</code>\n\nНазвание сайта, клиент, телефон, ссылка на сайт, ссылка Claude, дата сдачи (если нет — сегодня). Срок сервиса 12 месяцев.',
  svBad: 'Не понял. Напишите хотя бы название сайта. Например: <code>Кафе Навo, Анвар, +998901234567, kafenavo.uz</code>', svSaved: '✅ Добавлено в сервис.',
  bSvSite: '🌐 Сайт', bSvPhone: '📞 Получить номер', bSvReq: '➕ Запрос', bSvDel: '🗑 Удалить', bSvSetClaude: '🤖 Добавить ссылку Claude', bSvSetSite: '🌐 Добавить ссылку на сайт',
  svLinkAsk: (l) => `Отправьте ссылку (${l}):`, svLinkBad: 'Ссылка неверная. Отправьте в виде https://...', svLinkSaved: '✅ Сохранено.',
  svReqAsk: '🔧 Что клиент просит изменить? Напишите:', svReqSaved: '✅ Запрос записан.', svDelAsk: '🗑 Удалить из сервиса?', svDeleted: '🗑 Удалено.',
  svRem: (n, c, d, end) => `🛠 <b>${n}</b>${c ? ` · ${c}` : ''} — годовой сервис ${d <= 0 ? 'закончился' : `заканчивается через <b>${d} дн.</b>`} (${end}).\nПредложите клиенту платное обслуживание (ежемесячный платёж).`,
  bSvFromProj: '🛠 В сервис', svFromProjDone: '✅ Добавлено в сервис. Не забудьте добавить ссылку Claude.', cmdSv: '🛠 /servis — готовые сайты, сервис, ссылка Claude',
};
const en = {
  ...uz,
  bSvc: '🛠 Service', svLeft: left.en, svDoneLbl: 'Delivered', svSvcLbl: 'Service', svEndLbl: 'until', svReqLbl: '🔧 Requests',
  svTitle: (n, a) => `🛠 <b>Service</b> (${n}) — active: ${a}`, svNone: 'No sites yet. Add with /servis or tap “🛠 To service” on a finished project.', svSearchNone: (q) => `Nothing found for “${q}”.`,
  svAsk: '🛠 <b>New service</b>\n\nIn one message, comma-separated, any order:\n<code>Cafe Navo, Anvar, +998901234567, kafenavo.uz, https://claude.ai/code/..., 15.10</code>\n\nSite name, client, phone, site link, Claude link, delivery date (today if omitted). Service period is 12 months.',
  svBad: 'Could not read it. At least write the site name. Example: <code>Cafe Navo, Anvar, +998901234567, kafenavo.uz</code>', svSaved: '✅ Added to service.',
  bSvSite: '🌐 Site', bSvPhone: '📞 Get number', bSvReq: '➕ Request', bSvDel: '🗑 Delete', bSvSetClaude: '🤖 Add Claude link', bSvSetSite: '🌐 Add site link',
  svLinkAsk: (l) => `Send the link (${l}):`, svLinkBad: 'Invalid link. Send it as https://...', svLinkSaved: '✅ Saved.',
  svReqAsk: '🔧 What did the client ask to change? Type it:', svReqSaved: '✅ Request saved.', svDelAsk: '🗑 Delete from service?', svDeleted: '🗑 Deleted.',
  svRem: (n, c, d, end) => `🛠 <b>${n}</b>${c ? ` · ${c}` : ''} — the 1-year service ${d <= 0 ? 'has ended' : `ends in <b>${d} days</b>`} (${end}).\nOffer the client a paid plan (monthly payment).`,
  bSvFromProj: '🛠 To service', svFromProjDone: '✅ Added to service. Remember to add the Claude link.', cmdSv: '🛠 /servis — finished sites, service, Claude link',
};
module.exports = { uz, ru, en };
