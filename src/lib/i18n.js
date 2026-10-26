import { useSyncExternalStore } from 'react';

// Ilova matnlari: o'zbek, rus, ingliz. Kalitlar uchala tilda bir xil.
const ruShort = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const enShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const plural = (n, [one, few, many]) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many;
};

const uz = {
  months: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  weekdays: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
  wdShort: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  shortDate: (d, m) => `${d}-${uz.months[m].toLowerCase()}`,
  today: 'Bugun', tomorrow: 'Ertaga', close: 'Yopish',
  appTitle: 'Uchrashuvlar',
  tabUpcoming: 'Kelgusi', tabCalendar: 'Kalendar', tabSettings: 'Sozlamalar', tabAdd: 'Uchrashuv qoʻshish', menu: 'Asosiy menyu',
  upNext: 'Keyingi uchrashuv', upPrep: 'Tayyorgarlik', upNone: 'Hali uchrashuv yoʻq', upNoSoon: 'Yaqin uchrashuv yoʻq',
  upHint: 'Kim bilan, qachon va nimalarni olib borishni yozib qoʻying. Hammasi bir joyda turadi.', upAdd: 'Uchrashuv qoʻshish',
  upPast: 'Oʻtgan uchrashuvlar', search: 'Qidirish: ism, joy, telefon...', all: 'Hammasi', noResults: 'Hech narsa topilmadi', clearFilter: 'Tozalash',
  calTitle: 'Kalendar', calToday: 'Bugun', calPrev: 'Oldingi oy', calNext: 'Keyingi oy', calAria: 'Oy kalendari', calCount: (n) => `, ${n} ta uchrashuv`, calNone: 'Bu kunda uchrashuv yoʻq.', calAddDay: 'Shu kunga qoʻshish',
  dTitle: 'Uchrashuv', dDate: 'Sana', dTime: 'Vaqt', dPlace: 'Joy', dPhone: 'Telefon', dCall: 'Qoʻngʻiroq qilish', dChecklist: 'Olib borish yoki berish kerak', dNotes: 'Izoh',
  dGoogle: 'Google xarita', dYandex: 'Yandex xarita', dCat: 'Turkum', dInvite: 'Taklif', dDone: 'Bordim', dCancelled: 'Bekor qilindi', dReopen: 'Qayta tiklash',
  dStatusDone: 'Borilgan', dStatusCancelled: 'Bekor qilingan', dGuests: (n) => `Taklif qilinganlar: ${n}`, dFrom: (n) => `Taklif qilgan: ${n}`, dDelete: 'Oʻchirish', dEdit: 'Tahrirlash',
  fNew: 'Yangi uchrashuv', fEdit: 'Uchrashuvni tahrirlash', fWho: 'Kim bilan uchrashasiz?', fWhoPh: 'Masalan, Aziz Karimov', fDate: 'Sana', fTime: 'Vaqt',
  fPlace: 'Joy', fPlacePh: 'Masalan, Amir Temur xiyoboni yonidagi kafe', fPhone: 'Telefon raqam', fPhonePh: '+998 90 123 45 67', fCat: 'Turkum', fNoCat: 'Belgisiz',
  fFav: 'Sevimli joylar', fRecent: 'Oxirgi joylar', fStar: 'Sevimlilarga qoʻshish', fUnstar: 'Sevimlilardan olib tashlash',
  fBring: 'Olib borish yoki berish kerak', fBringPh: 'Masalan, shartnoma nusxasi', fAddItem: 'Qoʻshish', fRemoveItem: 'olib tashlash',
  fNotes: 'Izoh', fNotesPh: 'Mavzu, muhim eslatmalar', fCancel: 'Bekor qilish', fSave: 'Saqlash',
  eName: 'Ismni kiriting.', eDate: 'Sanani tanlang.', eTime: 'Vaqtni tanlang.',
  cDelTitle: 'Uchrashuvni oʻchirasizmi?', cDelText: 'Bu amalni qaytarib boʻlmaydi.', cDelYes: 'Oʻchirish',
  toastSaved: 'Saqlandi', toastDeleted: 'Oʻchirildi', toastDone: 'Belgilandi', toastCopied: 'Havola nusxalandi', toastInviteErr: 'Taklif yaratib boʻlmadi',
  cdNow: 'Hozir boshlandi', cdMin: (n) => `${n} daqiqadan keyin`, cdHM: (h, m) => (m ? `${h} soat ${m} daqiqadan keyin` : `${h} soatdan keyin`), cdDays: (n) => `${n} kundan keyin`, past: 'Oʻtgan',
  cats: { work: 'Ish', family: 'Oila', personal: 'Shaxsiy', other: 'Boshqa' },
  sTitle: 'Sozlamalar', sLang: 'Til', sPlaces: 'Sevimli joylar', sNoPlaces: 'Hali sevimli joy yoʻq. Uchrashuv qoʻshganda joy yonidagi ★ tugmasini bosing.', sBot: 'Telegram bot', sBotText: 'Eslatmalar, kunlik xulosa, jim soatlar va statistika botda sozlanadi.', sBotOpen: 'Botni ochish', sRemove: 'Olib tashlash',
};
const ru = {
  ...uz,
  months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  weekdays: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
  wdShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  shortDate: (d, m) => `${d} ${ruShort[m]}`,
  today: 'Сегодня', tomorrow: 'Завтра', close: 'Закрыть',
  appTitle: 'Встречи',
  tabUpcoming: 'Ближайшие', tabCalendar: 'Календарь', tabSettings: 'Настройки', tabAdd: 'Добавить встречу', menu: 'Главное меню',
  upNext: 'Следующая встреча', upPrep: 'Подготовка', upNone: 'Встреч пока нет', upNoSoon: 'Ближайших встреч нет',
  upHint: 'Запишите, с кем, когда и что взять с собой. Всё хранится в одном месте.', upAdd: 'Добавить встречу',
  upPast: 'Прошедшие встречи', search: 'Поиск: имя, место, телефон...', all: 'Все', noResults: 'Ничего не найдено', clearFilter: 'Сбросить',
  calTitle: 'Календарь', calToday: 'Сегодня', calPrev: 'Предыдущий месяц', calNext: 'Следующий месяц', calAria: 'Календарь месяца', calCount: (n) => `, встреч: ${n}`, calNone: 'В этот день встреч нет.', calAddDay: 'Добавить на этот день',
  dTitle: 'Встреча', dDate: 'Дата', dTime: 'Время', dPlace: 'Место', dPhone: 'Телефон', dCall: 'Позвонить', dChecklist: 'Что взять или передать', dNotes: 'Заметка',
  dGoogle: 'Google Карты', dYandex: 'Яндекс Карты', dCat: 'Категория', dInvite: 'Пригласить', dDone: 'Был(а)', dCancelled: 'Отменена', dReopen: 'Вернуть',
  dStatusDone: 'Состоялась', dStatusCancelled: 'Отменена', dGuests: (n) => `Приглашено: ${n}`, dFrom: (n) => `Пригласил: ${n}`, dDelete: 'Удалить', dEdit: 'Изменить',
  fNew: 'Новая встреча', fEdit: 'Редактировать встречу', fWho: 'С кем встречаетесь?', fWhoPh: 'Например, Азиз Каримов', fDate: 'Дата', fTime: 'Время',
  fPlace: 'Место', fPlacePh: 'Например, кафе у парка Амира Темура', fPhone: 'Номер телефона', fPhonePh: '+998 90 123 45 67', fCat: 'Категория', fNoCat: 'Без категории',
  fFav: 'Избранные места', fRecent: 'Недавние места', fStar: 'Добавить в избранное', fUnstar: 'Убрать из избранного',
  fBring: 'Что взять или передать', fBringPh: 'Например, копия договора', fAddItem: 'Добавить', fRemoveItem: 'убрать',
  fNotes: 'Заметка', fNotesPh: 'Тема, важные напоминания', fCancel: 'Отмена', fSave: 'Сохранить',
  eName: 'Введите имя.', eDate: 'Выберите дату.', eTime: 'Выберите время.',
  cDelTitle: 'Удалить встречу?', cDelText: 'Это действие нельзя отменить.', cDelYes: 'Удалить',
  toastSaved: 'Сохранено', toastDeleted: 'Удалено', toastDone: 'Отмечено', toastCopied: 'Ссылка скопирована', toastInviteErr: 'Не удалось создать приглашение',
  cdNow: 'Уже началась',
  cdMin: (n) => `через ${n} ${plural(n, ['минуту', 'минуты', 'минут'])}`,
  cdHM: (h, m) => (m ? `через ${h} ${plural(h, ['час', 'часа', 'часов'])} ${m} ${plural(m, ['минуту', 'минуты', 'минут'])}` : `через ${h} ${plural(h, ['час', 'часа', 'часов'])}`),
  cdDays: (n) => `через ${n} ${plural(n, ['день', 'дня', 'дней'])}`, past: 'Прошла',
  cats: { work: 'Работа', family: 'Семья', personal: 'Личное', other: 'Другое' },
  sTitle: 'Настройки', sLang: 'Язык', sPlaces: 'Избранные места', sNoPlaces: 'Избранных мест пока нет. Нажмите ★ рядом с местом при добавлении встречи.', sBot: 'Telegram-бот', sBotText: 'Напоминания, ежедневная сводка, тихие часы и статистика настраиваются в боте.', sBotOpen: 'Открыть бота', sRemove: 'Убрать',
};
const en = {
  ...uz,
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  wdShort: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  shortDate: (d, m) => `${enShort[m]} ${d}`,
  today: 'Today', tomorrow: 'Tomorrow', close: 'Close',
  appTitle: 'Meetings',
  tabUpcoming: 'Upcoming', tabCalendar: 'Calendar', tabSettings: 'Settings', tabAdd: 'Add meeting', menu: 'Main menu',
  upNext: 'Next meeting', upPrep: 'Preparation', upNone: 'No meetings yet', upNoSoon: 'No upcoming meetings',
  upHint: 'Write down who, when and what to bring. Everything stays in one place.', upAdd: 'Add meeting',
  upPast: 'Past meetings', search: 'Search: name, place, phone...', all: 'All', noResults: 'Nothing found', clearFilter: 'Clear',
  calTitle: 'Calendar', calToday: 'Today', calPrev: 'Previous month', calNext: 'Next month', calAria: 'Month calendar', calCount: (n) => `, ${n} meeting${n > 1 ? 's' : ''}`, calNone: 'No meetings on this day.', calAddDay: 'Add to this day',
  dTitle: 'Meeting', dDate: 'Date', dTime: 'Time', dPlace: 'Place', dPhone: 'Phone', dCall: 'Call', dChecklist: 'To bring or give', dNotes: 'Notes',
  dGoogle: 'Google Maps', dYandex: 'Yandex Maps', dCat: 'Category', dInvite: 'Invite', dDone: 'Attended', dCancelled: 'Cancelled', dReopen: 'Reopen',
  dStatusDone: 'Attended', dStatusCancelled: 'Cancelled', dGuests: (n) => `Invited: ${n}`, dFrom: (n) => `Invited by: ${n}`, dDelete: 'Delete', dEdit: 'Edit',
  fNew: 'New meeting', fEdit: 'Edit meeting', fWho: 'Who are you meeting?', fWhoPh: 'E.g. Aziz Karimov', fDate: 'Date', fTime: 'Time',
  fPlace: 'Place', fPlacePh: 'E.g. cafe near Amir Temur park', fPhone: 'Phone number', fPhonePh: '+998 90 123 45 67', fCat: 'Category', fNoCat: 'None',
  fFav: 'Favorite places', fRecent: 'Recent places', fStar: 'Add to favorites', fUnstar: 'Remove from favorites',
  fBring: 'To bring or give', fBringPh: 'E.g. copy of the contract', fAddItem: 'Add', fRemoveItem: 'remove',
  fNotes: 'Notes', fNotesPh: 'Topic, important reminders', fCancel: 'Cancel', fSave: 'Save',
  eName: 'Enter a name.', eDate: 'Choose a date.', eTime: 'Choose a time.',
  cDelTitle: 'Delete this meeting?', cDelText: 'This cannot be undone.', cDelYes: 'Delete',
  toastSaved: 'Saved', toastDeleted: 'Deleted', toastDone: 'Marked', toastCopied: 'Link copied', toastInviteErr: 'Could not create an invitation',
  cdNow: 'Just started', cdMin: (n) => `in ${n} min`, cdHM: (h, m) => (m ? `in ${h} h ${m} min` : `in ${h} h`), cdDays: (n) => `in ${n} days`, past: 'Past',
  cats: { work: 'Work', family: 'Family', personal: 'Personal', other: 'Other' },
  sTitle: 'Settings', sLang: 'Language', sPlaces: 'Favorite places', sNoPlaces: 'No favorite places yet. Tap ★ next to the place when adding a meeting.', sBot: 'Telegram bot', sBotText: 'Reminders, daily summary, quiet hours and statistics are set up in the bot.', sBotOpen: 'Open the bot', sRemove: 'Remove',
};

export const DICT = { uz, ru, en };
export const LANGS = [['uz', "O'zbekcha"], ['ru', 'Русский'], ['en', 'English']];
const KEY = 'uchrashuvlar:lang';

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && DICT[saved]) return saved;
  } catch { /* ignore */ }
  const code = (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || navigator.language || '').toLowerCase();
  return code.startsWith('ru') ? 'ru' : code.startsWith('en') ? 'en' : 'uz';
}
export const hasSavedLang = () => { try { return Boolean(localStorage.getItem(KEY)); } catch { return false; } };

let lang = detect();
const subs = new Set();
export const getLang = () => lang;
export function setLang(l, persist = true) {
  if (!DICT[l] || l === lang) return;
  lang = l;
  if (persist) { try { localStorage.setItem(KEY, l); } catch { /* ignore */ } }
  document.documentElement.lang = l;
  subs.forEach((f) => f());
}
document.documentElement.lang = lang;
export const useLang = () => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, getLang);
export function t(key, ...args) {
  const v = DICT[lang][key] ?? DICT.uz[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}
