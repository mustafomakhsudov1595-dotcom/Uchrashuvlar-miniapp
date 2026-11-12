import { useState } from 'react';
import { IconCalendar, IconChevronLeft, IconChevronRight } from './Icons.jsx';
import { addDays, formatWithWeekday, fromISODate, monthGrid, monthTitle, toISODate } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

// Chiroyli sana tanlash: tizimning standart kalendari oʻrniga formaning ichida ochiladigan kalendar.
export default function DateField({ id, value, onChange, invalid = false, quick = true }) {
  const [open, setOpen] = useState(false);
  const today = toISODate(new Date());
  const base = value ? fromISODate(value) : new Date();
  const [cur, setCur] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const shift = (d) => {
    const x = new Date(cur.y, cur.m + d, 1);
    setCur({ y: x.getFullYear(), m: x.getMonth() });
  };
  const pick = (iso) => {
    onChange(iso);
    setOpen(false);
  };
  const toggle = () => {
    if (!open) {
      const b = value ? fromISODate(value) : new Date();
      setCur({ y: b.getFullYear(), m: b.getMonth() });
    }
    setOpen(!open);
  };
  const chips = [[t('today'), today], [t('tomorrow'), toISODate(addDays(new Date(), 1))], ['+7', toISODate(addDays(new Date(), 7))], ['+30', toISODate(addDays(new Date(), 30))]];

  return (
    <div className={`datefield${open ? ' open' : ''}`}>
      <button type="button" id={id} className={`input date-btn${invalid ? ' err' : ''}`} onClick={toggle} aria-expanded={open} aria-invalid={invalid}>
        <IconCalendar width={18} height={18} />
        <span>{value ? formatWithWeekday(value) : '—'}</span>
      </button>
      {open && (
        <div className="date-pop">
          {quick && (
            <div className="date-chips">
              {chips.map(([l, v]) => <button type="button" key={l} className={`cat-chip${value === v ? ' on' : ''}`} onClick={() => pick(v)}>{l}</button>)}
            </div>
          )}
          <div className="date-nav">
            <button type="button" className="round-btn" onClick={() => shift(-1)} aria-label={t('calPrev')}><IconChevronLeft width={18} height={18} /></button>
            <b>{monthTitle(cur.y, cur.m)}</b>
            <button type="button" className="round-btn" onClick={() => shift(1)} aria-label={t('calNext')}><IconChevronRight width={18} height={18} /></button>
          </div>
          <div className="date-grid">
            {t('wdShort').map((w) => <small key={w}>{w}</small>)}
            {monthGrid(cur.y, cur.m).map((c) => (
              <button type="button" key={c.iso} className={`dd${c.inMonth ? '' : ' out'}${c.iso === today ? ' today' : ''}${c.iso === value ? ' on' : ''}`} onClick={() => pick(c.iso)}>{c.day}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
