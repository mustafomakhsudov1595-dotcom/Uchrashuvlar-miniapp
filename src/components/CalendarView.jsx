import { useEffect, useMemo, useState } from 'react';
import MeetingCard from './MeetingCard.jsx';
import Illustration from './Illustration.jsx';
import { IconChevronLeft, IconChevronRight, IconSettings } from './Icons.jsx';
import { meetingsOn } from '../lib/meetings.js';
import { formatShort, formatWithWeekday, fromISODate, monthGrid, monthTitle, toISODate } from '../lib/dates.js';
import { meetingStart } from '../lib/dates.js';
import { haptic } from '../lib/telegram.js';
import { t } from '../lib/i18n.js';

export default function CalendarView({ meetings, now, selected, onSelect, onOpen, onAdd, onDone, onDelete, onSettings }) {
  const [cursor, setCursor] = useState(() => {
    const d = fromISODate(selected);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    const d = fromISODate(selected);
    setCursor((c) => (c.y === d.getFullYear() && c.m === d.getMonth() ? c : { y: d.getFullYear(), m: d.getMonth() }));
  }, [selected]);

  const today = toISODate(now);
  const byDate = useMemo(() => {
    const map = new Map();
    for (const m of meetings) {
      if (m.status === 'cancelled') continue;
      const l = map.get(m.date) || [];
      l.push(m);
      map.set(m.date, l);
    }
    return map;
  }, [meetings]);
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
      <header className="home-head">
        <div>
          <p className="greet">{t('calTitle')}</p>
          <h1>{monthTitle(cursor.y, cursor.m)}</h1>
        </div>
        <div className="head-btns">
          <button type="button" className="round-btn txt" onClick={goToday}>
            {t('calToday')}
          </button>
          <button type="button" className="round-btn" onClick={onSettings} aria-label={t('sTitle')}>
            <IconSettings width={20} height={20} />
          </button>
        </div>
      </header>

      <section className="cal" aria-label={t('calAria')}>
        <div className="cal-nav">
          <button type="button" className="round-btn" onClick={() => shiftMonth(-1)} aria-label={t('calPrev')}>
            <IconChevronLeft width={20} height={20} />
          </button>
          <button type="button" className="round-btn" onClick={() => shiftMonth(1)} aria-label={t('calNext')}>
            <IconChevronRight width={20} height={20} />
          </button>
        </div>
        <div className="cal-week" aria-hidden="true">
          {t('wdShort').map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((c) => {
            const list = byDate.get(c.iso) || [];
            const cats = [...new Set(list.map((m) => m.cat || 'none'))].slice(0, 3);
            const cls = ['day', !c.inMonth && 'out', c.iso === today && 'today', c.iso === selected && 'selected'].filter(Boolean).join(' ');
            return (
              <button
                type="button"
                key={c.iso}
                className={cls}
                aria-pressed={c.iso === selected}
                aria-current={c.iso === today ? 'date' : undefined}
                aria-label={`${formatShort(c.iso)}${list.length ? t('calCount', list.length) : ''}`}
                onClick={() => pick(c)}
              >
                <span>{c.day}</span>
                <span className="dots" aria-hidden="true">
                  {cats.map((k) => (
                    <i key={k} className={`cat-dot cat-${k}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>{formatWithWeekday(selected)}</h2>
          <span className="count-pill">{dayMeetings.length}</span>
        </div>
        {dayMeetings.length ? (
          <div className="cards">
            {dayMeetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} onOpen={onOpen} onDone={onDone} onDelete={onDelete} muted={meetingStart(m) < now && !m.status} />
            ))}
          </div>
        ) : (
          <div className="empty-day">
            <Illustration />
            <h3>{t('calNone')}</h3>
            <button type="button" className="btn btn-accent" onClick={() => onAdd(selected)}>
              {t('calAddDay')}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
