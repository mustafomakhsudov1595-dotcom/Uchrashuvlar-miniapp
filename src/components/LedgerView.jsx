import { useMemo, useState } from 'react';
import { ledgerOf, monthly, summarize } from '../lib/ledger.js';
import { money, owed } from '../lib/projects.js';
import { summary as paySummary } from '../lib/payables.js';
import { getLang, t } from '../lib/i18n.js';

const PER = ['today', 'week', 'month', 'year', 'all'];
const UZ_MON = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const compact = (n) => (n >= 1e6 ? `${Math.round(n / 1e5) / 10}m` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : n ? String(n) : '');
const fm = (n) => `${n < 0 ? '−' : ''}${money(Math.abs(n))}`;
const KIND_ICON = { site: '🌐', bot: '🤖', video: '🎬', sub: '🔁', other: '📦' };
const CAT_ICON = { ads: '📣', team: '👥', host: '🌐', tools: '🧰', other: '📦' };

function Breakdown({ title, rows, total, color, labelOf }) {
  if (!rows.length) return null;
  return (
    <section className="panel ld-panel">
      <h3>{title}</h3>
      <ul className="ld-bd">
        {rows.slice(0, 5).map(([k, v]) => (
          <li key={k}>
            <span>{labelOf(k)}</span>
            <b>{money(v)}</b>
            <i className="ld-track"><em style={{ width: `${Math.max(3, (v / (total || 1)) * 100)}%`, background: color }} /></i>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Hisob-kitob: kirim, chiqim, foyda, kassa, oylar dinamikasi va amallar daftari
export default function LedgerView({ projects, subs, expenses, payables, today, onAddIncome, onAddExpense, onDelete }) {
  const [per, setPer] = useState('month');
  const [flt, setFlt] = useState('all');
  const [limit, setLimit] = useState(25);
  const all = useMemo(() => ledgerOf(projects, subs, expenses), [projects, subs, expenses]);
  const s = useMemo(() => summarize(all, per, today), [all, per, today]);
  const series = useMemo(() => monthly(all, 6, today), [all, today]);
  const debt = projects.reduce((n, p) => n + owed(p), 0);
  const toPay = paySummary(payables, projects, subs, today).total;
  const names = t('months'), kinds = t('stKinds'), cats = t('exCats');
  const max = Math.max(1, ...series.map((x) => Math.max(x.inc, x.exp)));
  const list = s.list.filter((x) => flt === 'all' || x.dir === flt);
  const ratio = s.income + s.expense > 0 ? (s.income / (s.income + s.expense)) * 100 : 50;
  const mname = (m) => (getLang() === 'uz' ? UZ_MON[Number(m.slice(5)) - 1] : String(names[Number(m.slice(5)) - 1]).slice(0, 3));

  return (
    <>
      <div className="ld-chips">
        {PER.map((p) => <button type="button" key={p} className={`cat-chip${per === p ? ' on' : ''}`} onClick={() => { setPer(p); setLimit(25); }}>{t('hsPer')[p]}</button>)}
      </div>

      <section className="ld-hero">
        <small>{t('hsProfit')}</small>
        <b className={s.profit < 0 ? 'neg' : 'pos'}>{fm(s.profit)}</b>
        <div className="ld-cols">
          <div><span className="dot in" />{t('hsIn')}<strong>{fm(s.income)}</strong></div>
          <div><span className="dot out" />{t('hsOut')}<strong>{fm(s.expense)}</strong></div>
        </div>
        <i className="ld-ratio"><em style={{ width: `${ratio}%` }} /></i>
        <div className="ld-cash"><span>🏦 {t('hsCash')} <small>· {t('hsCashNote')}</small></span><strong className={s.cash < 0 ? 'neg' : ''}>{fm(s.cash)}</strong></div>
      </section>

      <div className="ld-actions">
        <button type="button" className="btn btn-primary" onClick={onAddIncome}>＋ {t('hsAddIn')}</button>
        <button type="button" className="btn btn-accent" onClick={onAddExpense}>－ {t('hsAddOut')}</button>
      </div>

      <section className="panel ld-panel">
        <h3>{t('hsTrend')}</h3>
        <div className="ld-chart">
          {series.map((x, i) => (
            <div key={x.m} className={`ld-col${i === series.length - 1 ? ' now' : ''}`}>
              <div className="ld-bars">
                <i className="in" style={{ height: `${(x.inc / max) * 100}%` }}><span>{compact(x.inc)}</span></i>
                <i className="out" style={{ height: `${(x.exp / max) * 100}%` }}><span>{compact(x.exp)}</span></i>
              </div>
              <small>{mname(x.m)}</small>
            </div>
          ))}
        </div>
      </section>

      <Breakdown title={t('hsSources')} rows={s.kinds} total={s.income} color="var(--ok, #2e9b6a)" labelOf={(k) => `${KIND_ICON[k] || '📦'} ${kinds[k] || k}`} />
      <Breakdown title={t('hsSpend')} rows={s.cats} total={s.expense} color="#d95050" labelOf={(k) => `${CAT_ICON[k] || '📦'} ${cats[k] || k}`} />

      {(debt > 0 || toPay > 0) && (
        <div className="ld-notes">
          {debt > 0 && <span>🧾 {t('hsDebt')}: <b>{money(debt)}</b></span>}
          {toPay > 0 && <span>💸 {t('hsToPay')}: <b>{money(toPay)}</b></span>}
        </div>
      )}

      <div className="ld-listhead">
        <h3>{t('hsPer')[per]}</h3>
        <div className="ld-chips sm">
          {[['all', 'hsAll'], ['in', 'hsIn'], ['out', 'hsOut']].map(([k, l]) => <button type="button" key={k} className={`cat-chip${flt === k ? ' on' : ''}`} onClick={() => setFlt(k)}>{t(l)}</button>)}
        </div>
      </div>
      {list.length === 0 ? <p className="empty small">{t('hsNone')}</p> : (
        <ul className="ld-list">
          {list.slice(0, limit).map((x) => (
            <li key={x.id}>
              <span className={`ld-ico ${x.dir}`}>{x.dir === 'in' ? KIND_ICON[x.kind] || '📦' : CAT_ICON[x.kind] || '📦'}</span>
              <span className="ld-main">
                <b>{x.label || (x.dir === 'in' ? kinds[x.kind] : cats[x.kind]) || '—'}</b>
                <small>{x.d.slice(8)}.{x.d.slice(5, 7)}.{x.d.slice(0, 4)}{x.auto ? ` · ${t('hsAuto')}` : ''}</small>
              </span>
              <strong className={x.dir === 'in' ? 'pos' : 'neg'}>{x.dir === 'in' ? '+' : '−'}{money(x.a)}</strong>
              {!x.auto && <button type="button" className="icon-btn" onClick={() => onDelete(x.id)} aria-label={t('dDelete')}>✕</button>}
            </li>
          ))}
        </ul>
      )}
      {list.length > limit && <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setLimit(limit + 25)}>{t('hsMore')}</button>}
    </>
  );
}
