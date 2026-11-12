'use strict';
// Servis tarixi, Claude havolasi nazorati, mijozga xabar shablonlari, haftalik tahlil (uz / ru / en)
const uz = {
  bSvHist: '📜 Tarix', bSvChg: '➕ Oʻzgarish', chgAsk: '📜 Saytga qanday oʻzgarish kiritildi? Qisqa yozing:', chgSaved: '✅ Tarixga yozildi.', chgLast: '📜 Soʻnggi oʻzgarishlar', histNone: 'Hali oʻzgarish yozilmagan. Soʻrov bajarilganda yoki “➕ Oʻzgarish” bosilganda shu yerga tushadi.',
  histTitle: (n, c) => `📜 <b>${n}</b> — oʻzgarishlar tarixi (${c})`, bHistReport: '📋 Hisobot matni',
  histReport: (n, items, days) => `«${n}» saytiga soʻnggi ${days} kunda kiritilgan oʻzgarishlar:\n\n${items}\n\nYana savol yoki oʻzgartirish boʻlsa, yozing.`, histReportNone: 'Bu davrda oʻzgarish yozilmagan.',
  clOk: '✅ ochiladi', clMissing: '❌ havola yoʻq', clBad: '⚠️ havola notoʻgʻri koʻrinishda', clDead: '❌ havola topilmadi (404)', clErr: '⚠️ javob bermayapti', clNone: 'tekshirilmagan',
  linksTitle: (n) => `🔗 <b>Claude havolalari</b> (${n})`, linksNote: 'Havolaning ochilishi tekshirildi. Sessiya hali ham mavjudligini faqat oʻzingiz ochganingizda bilasiz.', bSvLinks: '🔗 Havolalarni tekshirish', linksAllOk: '🎉 Hamma saytda Claude havolasi bor va ochiladi.',
  linksWeekly: (n) => `🔗 <b>${n} ta saytda Claude havolasi muammoli.</b> Servis kartasidan tuzating:`, svNoLinkTag: '🤖❗',
  bMsg: '✉️ Mijozga xabar', msgTitle: (n) => `✉️ <b>${n}</b> — qanday xabar?`, msgKinds: { pay: '💵 Toʻlov eslatmasi', done: '✅ Ish tayyor', delay: '⏳ Muddat koʻchdi', renew: '🔁 Servisni uzaytirish', upd: '🛠 Oʻzgartirish bajarildi' },
  msgSend: '✈️ Telegramʼda yuborish', msgWrite: '👤 Mijozga yozish', msgLang: 'Mijoz tili:', msgNoOwed: 'Qarz yoʻq — toʻlov xabari kerak emas.', msgCopy: 'Nusxalang yoki “Telegramʼda yuborish”ni bosing:',
  rekvAsk: '💳 <b>Toʻlov rekvizitlari</b>\nMijozga yuboriladigan xabarlarga qoʻshiladi. Yozing (masalan karta raqami va ism):\n<code>/rekvizit Karta: 8600 1234 5678 9012, Anvar K.</code>', rekvSaved: '✅ Rekvizit saqlandi.', rekvOff: 'Rekvizit oʻchirildi.', rekvNow: (t) => `💳 Hozirgi rekvizit: <code>${t}</code>\nOʻzgartirish: /rekvizit yangi matn · oʻchirish: /rekvizit off`,
  photoBig: '🖼 Rasm juda katta (5 MB gacha). Kichikroq yuboring.', photoFail: '🖼 Rasmni yuklab olib boʻlmadi. Qayta yuboring.', photoType: '🖼 Bu rasm turi qoʻllab-quvvatlanmaydi. JPG, PNG yoki WebP yuboring.', photoDefault: 'Bu rasmni tahlil qil va foydali narsalarni ayt.', bChatNew: '🆕 Yangi suhbat', chatCleared: '🧹 Suhbat tozalandi. Yangi savol bering.', insTitle: '✨ <b>Haftalik tahlil</b>', insFail: 'Tahlil hozir tayyorlanmadi. Birozdan keyin /tahlil ni qayta bosing.', cmdK: '💬 Shunchaki yozing — AI yordamchi javob beradi (internetdan ham qidiradi) · ✨ /tahlil — AI tahlil · 💳 /rekvizit — toʻlov rekviziti',
};
const ru = {
  ...uz,
  bSvHist: '📜 История', bSvChg: '➕ Изменение', chgAsk: '📜 Какое изменение внесено на сайт? Напишите коротко:', chgSaved: '✅ Записано в историю.', chgLast: '📜 Последние изменения', histNone: 'Изменений пока нет. Появятся, когда запрос выполнен или нажато «➕ Изменение».',
  histTitle: (n, c) => `📜 <b>${n}</b> — история изменений (${c})`, bHistReport: '📋 Текст отчёта',
  histReport: (n, items, days) => `Изменения на сайте «${n}» за последние ${days} дн.:\n\n${items}\n\nЕсли будут вопросы или правки — пишите.`, histReportNone: 'За этот период изменений нет.',
  clOk: '✅ открывается', clMissing: '❌ нет ссылки', clBad: '⚠️ ссылка в неверном формате', clDead: '❌ ссылка не найдена (404)', clErr: '⚠️ не отвечает', clNone: 'не проверено',
  linksTitle: (n) => `🔗 <b>Ссылки Claude</b> (${n})`, linksNote: 'Проверено, что ссылка открывается. Жива ли сама сессия, узнаете только открыв её.', bSvLinks: '🔗 Проверить ссылки', linksAllOk: '🎉 У всех сайтов есть ссылка Claude, и она открывается.',
  linksWeekly: (n) => `🔗 <b>У ${n} сайтов проблема со ссылкой Claude.</b> Исправьте в карточке сервиса:`,
  bMsg: '✉️ Сообщение клиенту', msgTitle: (n) => `✉️ <b>${n}</b> — какое сообщение?`, msgKinds: { pay: '💵 Напоминание об оплате', done: '✅ Работа готова', delay: '⏳ Срок сдвинулся', renew: '🔁 Продлить сервис', upd: '🛠 Правка выполнена' },
  msgSend: '✈️ Отправить в Telegram', msgWrite: '👤 Написать клиенту', msgLang: 'Язык клиента:', msgNoOwed: 'Долга нет — сообщение об оплате не нужно.', msgCopy: 'Скопируйте или нажмите «Отправить в Telegram»:',
  rekvAsk: '💳 <b>Платёжные реквизиты</b>\nДобавляются в сообщения клиентам. Напишите (например номер карты и имя):\n<code>/rekvizit Карта: 8600 1234 5678 9012, Анвар К.</code>', rekvSaved: '✅ Реквизиты сохранены.', rekvOff: 'Реквизиты удалены.', rekvNow: (t) => `💳 Текущие реквизиты: <code>${t}</code>\nИзменить: /rekvizit новый текст · удалить: /rekvizit off`,
  photoBig: '🖼 Изображение слишком большое (до 5 МБ). Отправьте поменьше.', photoFail: '🖼 Не удалось загрузить изображение. Отправьте ещё раз.', photoType: '🖼 Этот тип изображения не поддерживается. Отправьте JPG, PNG или WebP.', photoDefault: 'Проанализируй это изображение и скажи, что полезного в нём.', bChatNew: '🆕 Новый диалог', chatCleared: '🧹 Диалог очищен. Задайте новый вопрос.', insTitle: '✨ <b>Недельный анализ</b>', insFail: 'Анализ сейчас не получился. Нажмите /tahlil чуть позже.', cmdK: '💬 Просто напишите — ответит AI-помощник (ищет и в интернете) · ✨ /tahlil — AI-анализ · 💳 /rekvizit — реквизиты',
};
const en = {
  ...uz,
  bSvHist: '📜 History', bSvChg: '➕ Change', chgAsk: '📜 What change was made to the site? Keep it short:', chgSaved: '✅ Added to history.', chgLast: '📜 Latest changes', histNone: 'No changes yet. They appear when a request is done or “➕ Change” is tapped.',
  histTitle: (n, c) => `📜 <b>${n}</b> — change history (${c})`, bHistReport: '📋 Report text',
  histReport: (n, items, days) => `Changes made to “${n}” in the last ${days} days:\n\n${items}\n\nLet me know if you have more questions or changes.`, histReportNone: 'No changes recorded in this period.',
  clOk: '✅ opens', clMissing: '❌ no link', clBad: '⚠️ link has the wrong format', clDead: '❌ link not found (404)', clErr: '⚠️ not responding', clNone: 'not checked',
  linksTitle: (n) => `🔗 <b>Claude links</b> (${n})`, linksNote: 'Checked that the link opens. Whether the session itself is still alive you only learn by opening it.', bSvLinks: '🔗 Check links', linksAllOk: '🎉 Every site has a Claude link and it opens.',
  linksWeekly: (n) => `🔗 <b>${n} site(s) have a Claude link problem.</b> Fix them on the service card:`,
  bMsg: '✉️ Message to client', msgTitle: (n) => `✉️ <b>${n}</b> — which message?`, msgKinds: { pay: '💵 Payment reminder', done: '✅ Work is ready', delay: '⏳ Deadline moved', renew: '🔁 Renew service', upd: '🛠 Change completed' },
  msgSend: '✈️ Send via Telegram', msgWrite: '👤 Message the client', msgLang: 'Client language:', msgNoOwed: 'Nothing is owed — no payment message needed.', msgCopy: 'Copy it or tap “Send via Telegram”:',
  rekvAsk: '💳 <b>Payment details</b>\nAdded to messages for clients. Type them (e.g. card number and name):\n<code>/rekvizit Card: 8600 1234 5678 9012, Anvar K.</code>', rekvSaved: '✅ Payment details saved.', rekvOff: 'Payment details removed.', rekvNow: (t) => `💳 Current details: <code>${t}</code>\nChange: /rekvizit new text · remove: /rekvizit off`,
  photoBig: '🖼 The image is too large (up to 5 MB). Send a smaller one.', photoFail: '🖼 Could not download the image. Please send it again.', photoType: '🖼 This image type is not supported. Send JPG, PNG or WebP.', photoDefault: 'Analyze this image and tell me what is useful in it.', bChatNew: '🆕 New chat', chatCleared: '🧹 Chat cleared. Ask a new question.', insTitle: '✨ <b>Weekly insight</b>', insFail: 'Could not prepare the insight now. Try /tahlil again shortly.', cmdK: '💬 Just type — the AI assistant replies (and searches the web) · ✨ /tahlil — AI insight · 💳 /rekvizit — payment details',
};
module.exports = { uz, ru, en };
