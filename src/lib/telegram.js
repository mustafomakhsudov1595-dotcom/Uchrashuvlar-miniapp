// Telegram Mini App bilan ulanish.
// Bu yerda hech qanday maxfiy token yo'q va bo'lmasligi kerak.

const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

// Telegram skripti oddiy brauzerda ham yuklanadi, lekin initData faqat Telegram ichida bo'ladi.
export const isTelegram = Boolean(tg?.initData);
export const initData = tg?.initData ?? '';

const atLeast = (version) => {
  try {
    return Boolean(tg?.isVersionAtLeast?.(version));
  } catch {
    return false;
  }
};

const BG = { light: '#F3F6FA', dark: '#0A1626' };

function currentTheme() {
  if (isTelegram && tg.colorScheme) return tg.colorScheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const theme = currentTheme();
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[theme]);
  if (!isTelegram) return;
  try {
    if (atLeast('6.9')) tg.setHeaderColor(BG[theme]);
    if (atLeast('6.1')) tg.setBackgroundColor(BG[theme]);
    if (atLeast('7.10')) tg.setBottomBarColor(BG[theme]);
  } catch {
    /* eski Telegram versiyasi — e'tibor bermaymiz */
  }
}

export function initTelegram() {
  applyTheme();
  if (tg) {
    tg.ready(); // Telegram'ga: "ilova tayyor"
    tg.expand(); // to'liq balandlikka ochish
    if (isTelegram && atLeast('7.7')) {
      try {
        tg.disableVerticalSwipes(); // ro'yxatni aylantirganda ilova yopilib ketmasligi uchun
      } catch {
        /* ignore */
      }
    }
  }
  if (isTelegram) tg.onEvent('themeChanged', applyTheme);
  else window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
}

// Telegram'ning yuqoridagi "Orqaga" tugmasi (6.1+)
export const backButton = isTelegram && atLeast('6.1') ? tg.BackButton : null;

const feedback = () => (isTelegram && atLeast('6.1') ? tg.HapticFeedback : null);
const safe = (fn) => {
  try {
    fn();
  } catch {
    /* ignore */
  }
};

// Telefon tebranishi (haptic)
export const haptic = {
  tap: () => safe(() => feedback()?.impactOccurred('light')),
  select: () => safe(() => feedback()?.selectionChanged()),
  success: () => safe(() => feedback()?.notificationOccurred('success')),
  warning: () => safe(() => feedback()?.notificationOccurred('warning')),
  error: () => safe(() => feedback()?.notificationOccurred('error')),
};

export function openExternal(url) {
  if (isTelegram && tg.openLink) tg.openLink(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
