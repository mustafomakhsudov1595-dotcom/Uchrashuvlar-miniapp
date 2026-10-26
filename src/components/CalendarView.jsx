import { useEffect, useMemo, useState } from 'react';
import MeetingList from './MeetingRow.jsx';
import { IconChevronLeft, IconChevronRight, IconSettings } from './Icons.jsx';
import { countByDate, meetingsOn } from '../lib/meetings.js';
import { t } from '../lib/i18n.js';
import { formatShort, formatWithWeekday, fromISODate, monthGrid, monthTitle, toISODate } from '../lib/dates.js';
import { haptic } from '../lib/telegram.js';

export default function CalendarView({ meetings, now, selected, onSelect, onOpen, onAdd, onSettings }) {
  const [cursor, setCursor] = useState(() => {
    const d = fromISODate(selected);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Tanlangan kun boshqa oyga o'tsa (masalan, boshqa oyga uchrashuv qo'shilganda), kalendar ham o'sha oyni ko'rsatsin.
  useEffect(() => {
    const d = fromISODate(selected);
    setCursor((c) => (c.y === d.getFullYear() && c.m === d.getMonth() ? c : { y: d.getFullYear(), m: d.getMonth() }));
  }, [selected]);

  const today = toISODate(now);
  const counts = useMemo(() => countByDate(meetings), [meetings]);
  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const dayMeetings = useMemo(() => meetingsOn(meetings, selected), [meetings, selected]);

  const shiftMonth = (delta) => {
    haptic.select();
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const pick = (cell) => {
    haptic.select();
    if (!cell.inMonth) {
      const d = fromISODate(cell.iso);
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
    }
    onSelect(cell.iso);
  };

  const goToday = () => {
    haptic.select();
    const d = fromISODate(today);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    onSelect(today);
  };

  return (
    <>
      <header className="top top-row">
        <h1>{t('calTitle')}</h1>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label={t('sTitle')}>
          <IconSettings width={22} height={22} />
        </button>
      </header>

      <section className="cal" aria-label={t('calAria')}>
        <div className="cal-head">
          <h2 className="cal-title">{monthTitle(cursor.y, cursor.m)}</h2>
          <div className="cal-nav">
            <button type="button" className="link-btn" onClick={goToday}>
              {t('calToday')}
            </button>
            <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label={t('calPrev')}>
              <IconChevronLeft />
            </button>
            <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label={t('calNext')}>
              <IconChevronRight />
            </button>
          </div>
        </div>

        <div className="cal-week" aria-hidden="true">
          {t('wdShort').map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((c) => {
            const n = counts.get(c.iso) || 0;
            const cls = ['day', !c.inMonth && 'out', c.iso === today && 'today', c.iso === selected && 'selected']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                type="button"
                key={c.iso}
                className={cls}
                aria-pressed={c.iso === selected}
                aria-current={c.iso === today ? 'date' : undefined}
                aria-label={`${formatShort(c.iso)}${n ? t('calCount', n) : ''}`}
                onClick={() => pick(c)}
              >
                <span>{c.day}</span>
                <span className="dots" aria-hidden="true">
                  {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                    <i className="dot" key={i} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="group">
        <h2 className="group-title">{formatWithWeekday(selected)}</h2>
        {dayMeetings.length > 0 ? (
          <MeetingList items={dayMeetings} onOpen={onOpen} />
        ) : (
          <div className="empty small">
            <p>{t('calNone')}</p>
            <button type="button" className="btn btn-ghost" onClick={() => onAdd(selected)}>
              {t('calAddDay')}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
