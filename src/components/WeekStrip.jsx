import { useEffect, useRef } from 'react';
import { addDays, fromISODate, toISODate, weekdayIndex } from '../lib/dates.js';
import { t } from '../lib/i18n.js';
import { haptic } from '../lib/telegram.js';

// Gorizontal hafta lentasi: kunlar, ostida turkum ranglari nuqtalari.
export default function WeekStrip({ selected, onSelect, meetings, now }) {
  const ref = useRef(null);
  const today = toISODate(now);
  const days = Array.from({ length: 28 }, (_, i) => toISODate(addDays(fromISODate(today), i - 3)));
  const byDate = new Map();
  for (const m of meetings) {
    if (m.status === 'cancelled') continue;
    const list = byDate.get(m.date) || [];
    list.push(m);
    byDate.set(m.date, list);
  }

  useEffect(() => {
    const el = ref.current?.querySelector('[aria-pressed="true"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  return (
    <div className="strip" ref={ref} role="listbox" aria-label={t('calAria')}>
      {days.map((iso) => {
        const d = fromISODate(iso);
        const list = byDate.get(iso) || [];
        const cats = [...new Set(list.map((m) => m.cat || 'none'))].slice(0, 3);
        return (
          <button
            type="button"
            key={iso}
            className={`sday${iso === selected ? ' on' : ''}${iso === today ? ' today' : ''}`}
            aria-pressed={iso === selected}
            onClick={() => {
              haptic.select();
              onSelect(iso);
            }}
          >
            <small>{t('wdShort')[weekdayIndex(d)]}</small>
            <b>{d.getDate()}</b>
            <span className="sdots">
              {cats.map((c) => (
                <i key={c} className={`cat-dot cat-${c}`} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
