import { useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconSettings } from './Icons.jsx';
import { monthStats } from '../lib/stats.js';
import { monthTitle } from '../lib/dates.js';
import { t } from '../lib/i18n.js';
import { CATS } from '../lib/meetings.js';

function Bars({ values, labels, hi }) {
  const max = Math.max(1, ...values);
  return (
    <div className="bars">
      {values.map((v, i) => (
        <div key={i} className={`bar-col${v === max && v > 0 ? ' top' : ''}`}>
          <span className="bar-val">{v || ''}</span>
          <div className="bar-track">
            <i style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 40}ms` }} />
          </div>
          <small className={hi === i ? 'hi' : ''}>{labels[i]}</small>
        </div>
      ))}
    </div>
  );
}

function Donut({ data, total }) {
  const R = 38;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 100 100" className="donut" role="img" aria-label={t('stCats')}>
      <circle cx="50" cy="50" r={R} className="donut-bg" />
      {data.map((d) => {
        if (!d.n) return null;
        const len = (d.n / total) * C;
        const el = <circle key={d.key} cx="50" cy="50" r={R} className={`donut-seg cat-${d.key}`} strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} />;
        acc += len;
        return el;
      })}
      <text x="50" y="49" textAnchor="middle" className="donut-n">{total}</text>
      <text x="50" y="62" textAnchor="middle" className="donut-l">{t('stTotal')}</text>
    </svg>
  );
}

export default function StatsView({ meetings, now, onSettings }) {
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const s = useMemo(() => monthStats(meetings, cur.y, cur.m, now), [meetings, cur, now]);
  const shift = (d) => {
    const x = new Date(cur.y, cur.m + d, 1);
    setCur({ y: x.getFullYear(), m: x.getMonth() });
  };
  const diff = s.live - s.prev;
  const catData = [...CATS, 'none'].map((k) => ({ key: k, n: s.cats[k] }));
  const isNow = cur.y === now.getFullYear() && cur.m === now.getMonth();
  const hourLabels = Array.from({ length: 18 }, (_, i) => (i % 3 === 0 ? String(i + 6) : ''));
  const hours = s.hours.slice(6, 24);
  const wdNow = isNow ? (now.getDay() + 6) % 7 : -1;

  return (
    <>
      <header className="home-head">
        <div>
          <p className="greet">{t('statsTitle')}</p>
          <h1>{monthTitle(cur.y, cur.m)}</h1>
        </div>
        <div className="head-btns">
          <button type="button" className="round-btn" onClick={() => shift(-1)} aria-label={t('calPrev')}>
            <IconChevronLeft width={20} height={20} />
          </button>
          <button type="button" className="round-btn" onClick={() => shift(1)} aria-label={t('calNext')}>
            <IconChevronRight width={20} height={20} />
          </button>
          <button type="button" className="round-btn" onClick={onSettings} aria-label={t('sTitle')}>
            <IconSettings width={20} height={20} />
          </button>
        </div>
      </header>

      {s.total === 0 ? (
        <section className="empty small">
          <h2>{t('stNoData')}</h2>
        </section>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi big">
              <small>{t('stTotal')}</small>
              <b>{s.total}</b>
              <span className={diff >= 0 ? 'up' : 'down'}>{t('stVsPrev', diff)}</span>
            </div>
            <div className="kpi">
              <small>{t('stAttended')}</small>
              <b>{s.attended}</b>
            </div>
            <div className="kpi">
              <small>{t('stUpcoming')}</small>
              <b>{s.upcoming}</b>
            </div>
            <div className="kpi">
              <small>{t('stCancelled')}</small>
              <b>{s.cancelled}</b>
            </div>
          </div>

          <section className="panel">
            <h3>{t('stWeekday')}</h3>
            <Bars values={s.weekday} labels={t('wdShort')} hi={wdNow} />
          </section>

          <section className="panel">
            <h3>{t('stHours')}</h3>
            <Bars values={hours} labels={hourLabels} />
          </section>

          <section className="panel split">
            <div>
              <h3>{t('stCats')}</h3>
              <Donut data={catData} total={s.live || 1} />
            </div>
            <ul className="legend">
              {catData.filter((d) => d.n).map((d) => (
                <li key={d.key} className={`cat-${d.key}`}>
                  <i className="cat-dot" />
                  <span>{d.key === 'none' ? t('stNoCat') : t('cats')[d.key]}</span>
                  <b>{d.n}</b>
                </li>
              ))}
            </ul>
          </section>

          {s.checklistAll > 0 && (
            <section className="panel">
              <h3>{t('stChecklist')}</h3>
              <div className="prep">
                <span className="bar big"><i style={{ width: `${(s.checklistDone / s.checklistAll) * 100}%` }} /></span>
                <b>{t('stDoneOf', s.checklistDone, s.checklistAll)}</b>
              </div>
            </section>
          )}

          {s.places.length > 0 && (
            <section className="panel">
              <h3>{t('stPlaces')}</h3>
              <ul className="places">
                {s.places.map((p) => (
                  <li key={p.text}>
                    <span>{p.text}</span>
                    <span className="bar"><i style={{ width: `${(p.n / s.places[0].n) * 100}%` }} /></span>
                    <b>{p.n}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
