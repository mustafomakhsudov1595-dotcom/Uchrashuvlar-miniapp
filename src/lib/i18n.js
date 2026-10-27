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


// ---- Yangi dizayn uchun qo'shimcha matnlar ----
const X = {
  uz: {
    greetMorning: 'Xayrli tong', greetDay: 'Xayrli kun', greetEvening: 'Xayrli kech', greetNight: 'Xayrli tun',
    qaPlaceholders: ['ertaga 15:00 Anvar bilan, ofis', 'juma soat 14 bank, +998901234567', '28.10 10:30 vrach #shaxsiy', 'bugun kechqurun 7 tugʻilgan kun'],
    qaSend: 'Qoʻshish', qaMore: 'Qoʻshimcha maʼlumot kiriting', qaHint: 'Yozing — tushunaman',
    chipDate: 'Sana', chipTime: 'Vaqt', chipName: 'Kim', chipPlace: 'Joy', chipPhone: 'Telefon',
    nowLabel: 'Hozir', dayEmptyTitle: 'Bu kun boʻsh', dayEmptyText: 'Uchrashuv qoʻshing yoki tez qoʻshish satriga yozing.',
    secDay: 'Kun jadvali', secNext: 'Keyingi uchrashuvlar', heroOpen: 'Ochish', heroEmptyTitle: 'Yaqin uchrashuv yoʻq', heroEmptyText: 'Hammasi tinch. Yangi uchrashuv qoʻshing.',
    swDone: 'Bordim', swDelete: 'Oʻchirish', undo: 'Qaytarish', toastRestored: 'Qaytarildi', toastDeletedUndo: 'Oʻchirildi',
    tabHome: 'Bosh', tabStats: 'Statistika', statsTitle: 'Statistika', stTotal: 'Jami', stAttended: 'Oʻtgan', stUpcoming: 'Kelgusi', stCancelled: 'Bekor', stWeekday: 'Hafta kunlari', stHours: 'Soatlar boʻyicha',
    stCats: 'Turkumlar', stNoCat: 'Turkumsiz', stPlaces: 'Koʻp boriladigan joylar', stVsPrev: (n) => (n === 0 ? 'oʻtgan oyday' : n > 0 ? `oʻtgan oydan +${n}` : `oʻtgan oydan ${n}`), stNoData: 'Bu oyda maʼlumot yoʻq', stChecklist: 'Tayyorgarlik', stDoneOf: (a, b) => `${a}/${b} bajarildi`, stMonth: 'Oy',
    sTheme: 'Koʻrinish', sMode: 'Rejim', modeAuto: 'Avto', modeLight: 'Yorugʻ', modeDark: 'Qorongʻu', sAccent: 'Asosiy rang',
    accent: { teal: 'Feruza', blue: 'Koʻk', violet: 'Binafsha', rose: 'Atirgul', green: 'Yashil' },
    sCalendar: 'Kalendarga ulash', sCalendarText: 'Uchrashuvlaringiz telefon kalendariga (Apple / Google) avtomatik kelib turadi va oʻzgarsa yangilanadi.', sCalGet: 'Kalendar havolasini olish', sCalOpen: 'Kalendarga qoʻshish', sCalCopy: 'Havolani nusxalash',
    dDuplicate: 'Nusxa', dCalendar: 'Kalendarga', dGoogleCal: 'Google Calendar', dIcs: 'Boshqa kalendar (.ics)', fDuplicate: 'Nusxa — yangi sana tanlang', toastLinkCopied: 'Havola nusxalandi', toastCalErr: 'Kalendar havolasini olib boʻlmadi',
    searchOpen: 'Qidirish', uMin: 'daq', uH: 'soat', uD: 'kun', closeSearch: 'Yopish',
  },
  ru: {
    greetMorning: 'Доброе утро', greetDay: 'Добрый день', greetEvening: 'Добрый вечер', greetNight: 'Доброй ночи',
    qaPlaceholders: ['завтра 15:00 Анвар, офис', 'пятница в 14 банк, +998901234567', '28.10 10:30 врач #личное', 'сегодня вечером 7 день рождения'],
    qaSend: 'Добавить', qaMore: 'Дополните данные', qaHint: 'Пишите — я пойму',
    chipDate: 'Дата', chipTime: 'Время', chipName: 'Кто', chipPlace: 'Место', chipPhone: 'Телефон',
    nowLabel: 'Сейчас', dayEmptyTitle: 'В этот день пусто', dayEmptyText: 'Добавьте встречу или напишите в строку быстрого добавления.',
    secDay: 'Расписание дня', secNext: 'Следующие встречи', heroOpen: 'Открыть', heroEmptyTitle: 'Ближайших встреч нет', heroEmptyText: 'Всё спокойно. Добавьте новую встречу.',
    swDone: 'Был(а)', swDelete: 'Удалить', undo: 'Вернуть', toastRestored: 'Возвращено', toastDeletedUndo: 'Удалено',
    tabHome: 'Главная', tabStats: 'Статистика', statsTitle: 'Статистика', stTotal: 'Всего', stAttended: 'Прошли', stUpcoming: 'Предстоят', stCancelled: 'Отменены', stWeekday: 'Дни недели', stHours: 'По часам',
    stCats: 'Категории', stNoCat: 'Без категории', stPlaces: 'Частые места', stVsPrev: (n) => (n === 0 ? 'как в прошлом месяце' : n > 0 ? `+${n} к прошлому месяцу` : `${n} к прошлому месяцу`), stNoData: 'В этом месяце данных нет', stChecklist: 'Подготовка', stDoneOf: (a, b) => `${a}/${b} выполнено`, stMonth: 'Месяц',
    sTheme: 'Внешний вид', sMode: 'Режим', modeAuto: 'Авто', modeLight: 'Светлый', modeDark: 'Тёмный', sAccent: 'Основной цвет',
    accent: { teal: 'Бирюзовый', blue: 'Синий', violet: 'Фиолетовый', rose: 'Розовый', green: 'Зелёный' },
    sCalendar: 'Подключить календарь', sCalendarText: 'Ваши встречи будут автоматически появляться в календаре телефона (Apple / Google) и обновляться при изменениях.', sCalGet: 'Получить ссылку календаря', sCalOpen: 'Добавить в календарь', sCalCopy: 'Скопировать ссылку',
    dDuplicate: 'Копия', dCalendar: 'В календарь', dGoogleCal: 'Google Календарь', dIcs: 'Другой календарь (.ics)', fDuplicate: 'Копия — выберите новую дату', toastLinkCopied: 'Ссылка скопирована', toastCalErr: 'Не удалось получить ссылку календаря',
    searchOpen: 'Поиск', uMin: 'мин', uH: 'ч', uD: 'дн', closeSearch: 'Закрыть',
  },
  en: {
    greetMorning: 'Good morning', greetDay: 'Good afternoon', greetEvening: 'Good evening', greetNight: 'Good night',
    qaPlaceholders: ['tomorrow 3pm lunch with Aziz, cafe', 'friday at 2pm bank, +998901234567', '28.10 10:30 doctor #personal', 'today evening 7 birthday'],
    qaSend: 'Add', qaMore: 'Fill in the missing details', qaHint: 'Type — I will understand',
    chipDate: 'Date', chipTime: 'Time', chipName: 'Who', chipPlace: 'Place', chipPhone: 'Phone',
    nowLabel: 'Now', dayEmptyTitle: 'Nothing planned', dayEmptyText: 'Add a meeting or type into the quick-add bar.',
    secDay: 'Day schedule', secNext: 'Next meetings', heroOpen: 'Open', heroEmptyTitle: 'No upcoming meetings', heroEmptyText: 'All quiet. Add a new meeting.',
    swDone: 'Attended', swDelete: 'Delete', undo: 'Undo', toastRestored: 'Restored', toastDeletedUndo: 'Deleted',
    tabHome: 'Home', tabStats: 'Stats', statsTitle: 'Statistics', stTotal: 'Total', stAttended: 'Past', stUpcoming: 'Upcoming', stCancelled: 'Cancelled', stWeekday: 'Weekdays', stHours: 'By hour',
    stCats: 'Categories', stNoCat: 'No category', stPlaces: 'Frequent places', stVsPrev: (n) => (n === 0 ? 'same as last month' : n > 0 ? `+${n} vs last month` : `${n} vs last month`), stNoData: 'No data this month', stChecklist: 'Preparation', stDoneOf: (a, b) => `${a}/${b} done`, stMonth: 'Month',
    sTheme: 'Appearance', sMode: 'Mode', modeAuto: 'Auto', modeLight: 'Light', modeDark: 'Dark', sAccent: 'Accent color',
    accent: { teal: 'Teal', blue: 'Blue', violet: 'Violet', rose: 'Rose', green: 'Green' },
    sCalendar: 'Connect calendar', sCalendarText: 'Your meetings will appear in your phone calendar (Apple / Google) automatically and stay up to date.', sCalGet: 'Get calendar link', sCalOpen: 'Add to calendar', sCalCopy: 'Copy link',
    dDuplicate: 'Copy', dCalendar: 'To calendar', dGoogleCal: 'Google Calendar', dIcs: 'Other calendar (.ics)', fDuplicate: 'Copy — pick a new date', toastLinkCopied: 'Link copied', toastCalErr: 'Could not get the calendar link',
    searchOpen: 'Search', uMin: 'min', uH: 'h', uD: 'd', closeSearch: 'Close',
  },
};
Object.assign(uz, X.uz);
Object.assign(ru, X.ru);
Object.assign(en, X.en);


// ---- Loyihalar bo'limi ----
const P = {
  uz: {
    tabProjects: 'Loyihalar', pjTitle: 'Loyihalar', pjSub: 'Sayt · Bot · Video', pjAdd: 'Yangi loyiha', pjNone: 'Hali loyiha yoʻq', pjNoneText: 'Buyurtmani tanlang — vazifalar muddatgacha avtomatik rejalashtiriladi.',
    pjActive: 'Faol', pjSoon: 'Yaqin muddat', pjOver: 'Kechikkan', pjAll: 'Hammasi', pjDoneList: 'Tayyor loyihalar', pjNoMatch: 'Bu filtr boʻyicha loyiha yoʻq',
    pTypes: { site: 'Sayt (Google)', bot: 'Telegram bot', video: 'Instagram video', other: 'Boshqa' },
    pTypeHint: { site: 'Google’da chiqadigan sayt', bot: 'Bot va mini ilova', video: 'Target reklama videosi', other: 'Boshqa ish' },
    pStatus: { new: 'Yangi', work: 'Jarayonda', review: 'Tekshiruvda', done: 'Tayyor', paused: 'Toʻxtatilgan' },
    pOverTag: (n) => `${n} kun kechikdi`, pLeftTag: (n) => `${n} kun qoldi`, pToday: 'Bugun muddat', pTomorrow: 'Ertaga muddat', pDoneTag: 'Tayyor',
    lblClient: 'Mijoz', lblContact: 'Aloqa', lblDeadline: 'Muddat', lblPrice: 'Narx', lblPaid: 'Toʻlandi', lblProgress: 'Jarayon', lblTasks: 'Vazifalar', lblStatus: 'Holat', lblDue: 'Muddati',
    pjAddTask: 'Vazifa qoʻshish', pjTaskPh: 'Masalan, logotipni tayyorlash', pjShift: (n) => `+${n} kun`, pjShiftLabel: 'Muddatni surish', pjDelTitle: 'Loyihani oʻchirasizmi?', pjDelText: 'Barcha vazifalari bilan oʻchadi. Bu amalni qaytarib boʻlmaydi.',
    pfNew: 'Yangi loyiha', pfEdit: 'Loyihani tahrirlash', pfName: 'Loyiha nomi', pfNamePh: 'Masalan, kafe uchun sayt', pfType: 'Turi', pfClient: 'Mijoz', pfClientPh: 'Ism yoki kompaniya', pfContact: 'Mijoz aloqasi', pfContactPh: '+998 90 123 45 67 yoki @username',
    pfDeadline: 'Tayyor boʻlish muddati', pfTime: 'Vaqt', pfPrice: 'Narxi (soʻm)', pfPaid: 'Toʻlangan (soʻm)', pfNotes: 'Izoh', pfAuto: (n) => `${n} ta vazifa muddatgacha avtomatik rejalashtiriladi`, pfAutoOff: 'Vazifalarni oʻzingiz qoʻshasiz',
    secDeadlines: 'Yaqin muddatlar', toastTaskAdded: 'Vazifa qoʻshildi', pjTasksDone: (a, b) => `${a}/${b} vazifa`, pjOpenProj: 'Loyihalar',
  },
  ru: {
    tabProjects: 'Проекты', pjTitle: 'Проекты', pjSub: 'Сайт · Бот · Видео', pjAdd: 'Новый проект', pjNone: 'Проектов пока нет', pjNoneText: 'Выберите тип заказа — задачи автоматически распределятся до срока.',
    pjActive: 'Активные', pjSoon: 'Срок скоро', pjOver: 'Просрочены', pjAll: 'Все', pjDoneList: 'Готовые проекты', pjNoMatch: 'По этому фильтру проектов нет',
    pTypes: { site: 'Сайт (Google)', bot: 'Telegram-бот', video: 'Instagram-видео', other: 'Другое' },
    pTypeHint: { site: 'Сайт для выдачи в Google', bot: 'Бот и мини-приложение', video: 'Таргет-видео для рекламы', other: 'Другая работа' },
    pStatus: { new: 'Новый', work: 'В работе', review: 'На проверке', done: 'Готов', paused: 'Пауза' },
    pOverTag: (n) => `просрочено на ${n} ${plural(n, ['день', 'дня', 'дней'])}`, pLeftTag: (n) => `осталось ${n} ${plural(n, ['день', 'дня', 'дней'])}`, pToday: 'Срок сегодня', pTomorrow: 'Срок завтра', pDoneTag: 'Готов',
    lblClient: 'Клиент', lblContact: 'Контакт', lblDeadline: 'Срок', lblPrice: 'Цена', lblPaid: 'Оплачено', lblProgress: 'Прогресс', lblTasks: 'Задачи', lblStatus: 'Статус', lblDue: 'Срок',
    pjAddTask: 'Добавить задачу', pjTaskPh: 'Например, подготовить логотип', pjShift: (n) => `+${n} ${plural(n, ['день', 'дня', 'дней'])}`, pjShiftLabel: 'Сдвинуть срок', pjDelTitle: 'Удалить проект?', pjDelText: 'Удалится вместе со всеми задачами. Отменить нельзя.',
    pfNew: 'Новый проект', pfEdit: 'Редактировать проект', pfName: 'Название проекта', pfNamePh: 'Например, сайт для кафе', pfType: 'Тип', pfClient: 'Клиент', pfClientPh: 'Имя или компания', pfContact: 'Контакт клиента', pfContactPh: '+998 90 123 45 67 или @username',
    pfDeadline: 'Срок сдачи', pfTime: 'Время', pfPrice: 'Цена (сум)', pfPaid: 'Оплачено (сум)', pfNotes: 'Заметка', pfAuto: (n) => `${n} ${plural(n, ['задача', 'задачи', 'задач'])} автоматически распределятся до срока`, pfAutoOff: 'Задачи добавите сами',
    secDeadlines: 'Ближайшие сроки', toastTaskAdded: 'Задача добавлена', pjTasksDone: (a, b) => `${a}/${b} задач`, pjOpenProj: 'Проекты',
  },
  en: {
    tabProjects: 'Projects', pjTitle: 'Projects', pjSub: 'Site · Bot · Video', pjAdd: 'New project', pjNone: 'No projects yet', pjNoneText: 'Pick an order type — tasks are scheduled up to the deadline automatically.',
    pjActive: 'Active', pjSoon: 'Due soon', pjOver: 'Overdue', pjAll: 'All', pjDoneList: 'Finished projects', pjNoMatch: 'No projects for this filter',
    pTypes: { site: 'Website (Google)', bot: 'Telegram bot', video: 'Instagram video', other: 'Other' },
    pTypeHint: { site: 'A site that ranks on Google', bot: 'Bot and mini app', video: 'Targeted ad video', other: 'Other work' },
    pStatus: { new: 'New', work: 'In progress', review: 'In review', done: 'Done', paused: 'Paused' },
    pOverTag: (n) => `${n} day${n > 1 ? 's' : ''} overdue`, pLeftTag: (n) => `${n} day${n > 1 ? 's' : ''} left`, pToday: 'Due today', pTomorrow: 'Due tomorrow', pDoneTag: 'Done',
    lblClient: 'Client', lblContact: 'Contact', lblDeadline: 'Deadline', lblPrice: 'Price', lblPaid: 'Paid', lblProgress: 'Progress', lblTasks: 'Tasks', lblStatus: 'Status', lblDue: 'Due',
    pjAddTask: 'Add a task', pjTaskPh: 'E.g. prepare the logo', pjShift: (n) => `+${n} day${n > 1 ? 's' : ''}`, pjShiftLabel: 'Move the deadline', pjDelTitle: 'Delete this project?', pjDelText: 'It will be deleted with all its tasks. This cannot be undone.',
    pfNew: 'New project', pfEdit: 'Edit project', pfName: 'Project name', pfNamePh: 'E.g. website for a cafe', pfType: 'Type', pfClient: 'Client', pfClientPh: 'Name or company', pfContact: 'Client contact', pfContactPh: '+998 90 123 45 67 or @username',
    pfDeadline: 'Delivery deadline', pfTime: 'Time', pfPrice: 'Price (UZS)', pfPaid: 'Paid (UZS)', pfNotes: 'Notes', pfAuto: (n) => `${n} task${n > 1 ? 's' : ''} will be scheduled up to the deadline automatically`, pfAutoOff: 'You will add tasks yourself',
    secDeadlines: 'Upcoming deadlines', toastTaskAdded: 'Task added', pjTasksDone: (a, b) => `${a}/${b} tasks`, pjOpenProj: 'Projects',
  },
};
Object.assign(uz, P.uz);
Object.assign(ru, P.ru);
Object.assign(en, P.en);

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
