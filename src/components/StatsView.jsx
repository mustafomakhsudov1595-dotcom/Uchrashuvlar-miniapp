import { useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconSettings } from './Icons.jsx';
import { monthStats } from '../lib/stats.js';
import { monthTitle } from '../lib/dates.js';
import { t, getLang } from '../lib/i18n.js';
import { CATS } from '../lib/meetings.js';
import { incomeByMonth } from '../lib/finance.js';
import { money, owed } from '../lib/projects.js';
import { todayISO } from '../lib/dates.js';

function Bars({ values, labels, hi, fmt }) {
  const max = Math.max(1, ...values);
  return (
    <div className="bars">
      {values.map((v, i) => (
        <div key={i} className={`bar-col${v === max && v > 0 ? ' top' : ''}`}>
          <span className="bar-val">{v ? (fmt ? fmt(v) : v) : ''}</span>
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

export default function StatsView({ meetings, projects = [], subs = [], expenses = [], goal = 0, onAddExpense, onDeleteExpense, onSetGoal, now, onSettings, noIncome = false, top = null }) {
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

      {top}
      {!noIncome && <IncomeCard projects={projects} subs={subs} expenses={expenses} goal={goal} onAddExpense={onAddExpense} onDeleteExpense={onDeleteExpense} onSetGoal={onSetGoal} />}

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

const UZ_MON = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const compact = (n) => (n >= 1e6 ? `${Math.round(n / 1e5) / 10}m` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

export function IncomeCard({ projects, subs, expenses = [], goal = 0, onAddExpense, onDeleteExpense, onSetGoal }) {
  const today = todayISO();
  const [editGoal, setEditGoal] = useState(false);
  const [goalText, setGoalText] = useState('');
  const months = useMemo(() => incomeByMonth(projects, subs, 6, today), [projects, subs, today]);
  const cur = months[months.length - 1];
  const sum = months.reduce((n, x) => n + x.total, 0);
  const debt = projects.reduce((n, p) => n + owed(p), 0);
  const names = t('months');
  const kinds = Object.entries(cur.k).filter(([, v]) => v > 0);
  const ym = today.slice(0, 7);
  const monthExp = useMemo(() => expenses.filter((x) => x.d.startsWith(ym)).sort((a, b) => (a.d < b.d ? 1 : -1)), [expenses, ym]);
  const expSum = monthExp.reduce((n, x) => n + x.a, 0);
  const net = cur.total - expSum;
  const pct = goal > 0 ? Math.min(100, Math.round((cur.total / goal) * 100)) : 0;
  const saveGoal = () => {
    onSetGoal(Math.max(0, Math.round(Number(goalText) || 0)));
    setEditGoal(false);
  };
  return (
    <section className="block income-card">
      <div className="section-title">
        <h4>{t('stIncome')}</h4>
        <span className="count">{t('stIncomeSub')}</span>
      </div>
      {sum === 0 && expSum === 0 ? (
        <p className="empty small">{t('stIncomeNone')}</p>
      ) : (
        <>
          <div className="debt-card income-sum ok">
            <small>{t('stIncomeThis')}</small>
            <b>{money(cur.total)}</b>
            <span>{t('stIncomeAvg')}: {money(sum / 6)}</span>
            {expSum > 0 && (
              <span className="net-line">
                {t('exTotal')}: {money(expSum)} · <em className={net < 0 ? 'neg' : 'pos'}>{t('exNet')}: {money(net)}</em>
              </span>
            )}
          </div>
          <Bars values={months.map((x) => x.total)} labels={months.map((x) => (getLang() === 'uz' ? UZ_MON[Number(x.m.slice(5)) - 1] : String(names[Number(x.m.slice(5)) - 1]).slice(0, 3)))} hi={months.length - 1} fmt={compact} />
          {kinds.length > 0 && (
            <ul className="pay-list">
              {kinds.map(([k, v]) => <li key={k}><span>{t('stKinds')[k]}</span><b>{money(v)}</b></li>)}
            </ul>
          )}
        </>
      )}

      <div className="goal-box">
        {goal > 0 && !editGoal ? (
          <>
            <div className="goal-head">
              <b>🎯 {t('goTitle')}</b>
              <button type="button" className="link-btn" onClick={() => { setGoalText(String(goal)); setEditGoal(true); }}>{money(goal)} ✎</button>
            </div>
            <span className="bar big"><i style={{ width: `${pct}%` }} /></span>
            <small>{pct >= 100 ? t('goDone') : t('goLeft', money(Math.max(0, goal - cur.total)), pct)}</small>
          </>
        ) : editGoal ? (
          <div className="add-row">
            <input className="input" type="number" inputMode="numeric" min="0" value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="10000000" autoFocus onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), saveGoal())} />
            <button type="button" className="btn btn-accent add-btn" onClick={saveGoal}>{t('fSave')}</button>
          </div>
        ) : (
          <button type="button" className="act-chip" onClick={() => { setGoalText(''); setEditGoal(true); }}>🎯 {t('goSet')}</button>
        )}
      </div>

      <div className="section-title" style={{ marginTop: 18 }}>
        <h4>{t('exTitle')}</h4>
        <button type="button" className="link-btn" onClick={onAddExpense}>+ {t('exAdd')}</button>
      </div>
      {monthExp.length === 0 ? (
        <p className="empty small">{t('exNone')}</p>
      ) : (
        <ul className="pay-list exp-list">
          {monthExp.slice(0, 8).map((x) => (
            <li key={x.id}>
              <span>{x.d.slice(5).replace('-', '.')} · {t('exCats')[x.cat]}{x.note ? ` · ${x.note}` : ''}</span>
              <b className="neg">−{money(x.a)}</b>
              <button type="button" className="icon-btn" onClick={() => onDeleteExpense(x.id)} aria-label={t('dDelete')}>✕</button>
            </li>
          ))}
        </ul>
      )}
      {debt > 0 && <p className="auto-note">🧾 {t('stDebt')}: {money(debt)}</p>}
    </section>
  );
}
