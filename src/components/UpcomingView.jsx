import { useMemo, useState } from 'react';
import NextMeetingCard from './NextMeetingCard.jsx';
import MeetingList from './MeetingRow.jsx';
import { IconChevronRight, IconSearch, IconSettings, IconClose } from './Icons.jsx';
import { byStart, CATS, groupByDate, splitMeetings } from '../lib/meetings.js';
import { dayLabel, formatWithWeekday, toISODate } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

export default function UpcomingView({ meetings, now, onOpen, onAdd, onSettings }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const query = q.trim().toLowerCase();
  const filtering = Boolean(query || cat);

  const { upcoming, past } = useMemo(() => splitMeetings(meetings, now), [meetings, now]);
  const results = useMemo(
    () =>
      filtering
        ? meetings
            .filter((m) => (!cat || m.cat === cat) && (!query || [m.name, m.location, m.phone, m.notes].some((f) => (f || '').toLowerCase().includes(query))))
            .sort(byStart)
        : [],
    [meetings, filtering, cat, query],
  );
  const [next, ...rest] = upcoming;
  const groups = groupByDate(rest);

  return (
    <>
      <header className="top top-row">
        <div>
          <h1>{t('appTitle')}</h1>
          <p>{formatWithWeekday(toISODate(now))}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label={t('sTitle')}>
          <IconSettings width={22} height={22} />
        </button>
      </header>

      {meetings.length > 0 && (
        <div className="filters">
          <div className="search">
            <IconSearch width={18} height={18} />
            <input
              className="input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search')}
              enterKeyHint="search"
              autoComplete="off"
            />
            {q && (
              <button type="button" className="icon-btn" onClick={() => setQ('')} aria-label={t('clearFilter')}>
                <IconClose width={16} height={16} />
              </button>
            )}
          </div>
          <div className="cat-chips" role="group" aria-label={t('fCat')}>
            <button type="button" className={`cat-chip${cat === '' ? ' on' : ''}`} onClick={() => setCat('')}>
              {t('all')}
            </button>
            {CATS.map((c) => (
              <button type="button" key={c} className={`cat-chip cat-${c}${cat === c ? ' on' : ''}`} onClick={() => setCat(cat === c ? '' : c)}>
                <i className="cat-dot" />
                {t('cats')[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtering ? (
        results.length ? (
          groupByDate(results).map((g) => (
            <section className="group" key={g.iso}>
              <h2 className="group-title">{dayLabel(g.iso, now)}</h2>
              <MeetingList items={g.items} onOpen={onOpen} />
            </section>
          ))
        ) : (
          <section className="empty small">
            <h2>{t('noResults')}</h2>
            <button type="button" className="btn btn-ghost" onClick={() => { setQ(''); setCat(''); }}>
              {t('clearFilter')}
            </button>
          </section>
        )
      ) : (
        <>
          {next ? (
            <NextMeetingCard meeting={next} now={now} onOpen={onOpen} />
          ) : (
            <section className="empty">
              <h2>{meetings.length ? t('upNoSoon') : t('upNone')}</h2>
              <p>{t('upHint')}</p>
              <button type="button" className="btn btn-primary" onClick={() => onAdd()}>
                {t('upAdd')}
              </button>
            </section>
          )}

          {groups.map((g) => (
            <section className="group" key={g.iso}>
              <h2 className="group-title">{dayLabel(g.iso, now)}</h2>
              <MeetingList items={g.items} onOpen={onOpen} />
            </section>
          ))}

          {past.length > 0 && (
            <details className="past-block">
              <summary>
                <IconChevronRight width={18} height={18} />
                {t('upPast')} ({past.length})
              </summary>
              <MeetingList items={past} onOpen={onOpen} muted />
            </details>
          )}
        </>
      )}
    </>
  );
}
