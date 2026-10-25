import { useEffect, useRef, useState } from 'react';
import { backButton } from './telegram.js';

// Joriy vaqtni har bir necha soniyada yangilab turadi ("2 soatdan keyin" matni uchun).
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms]);
  return now;
}

// Telegram'ning "Orqaga" tugmasini ko'rsatadi/yashiradi.
export function useBackButton(visible, onBack) {
  const ref = useRef(onBack);
  useEffect(() => {
    ref.current = onBack;
  });
  useEffect(() => {
    if (!backButton) return undefined;
    if (!visible) {
      backButton.hide();
      return undefined;
    }
    const handler = () => ref.current();
    backButton.show();
    backButton.onClick(handler);
    return () => backButton.offClick(handler);
  }, [visible]);
}
