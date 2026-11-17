import { useMemo, useState } from 'react';
import Choice from './Choice.jsx';
import { balances, ledgerOf, monthly, summarize } from '../lib/ledger.js';
import { money, owed } from '../lib/projects.js';
import { leftUzs, left as payLeft, summary as paySummary } from '../lib/payables.js';
import { fmtUsd, fmtUzs, fmtW, getRate } from '../lib/currency.js';
import { getLang, t } from '../lib/i18n.js';

const PER = ['today', 'week', 'month', 'year', 'all'];
const WAL = ['cash', 'card', 'usd'];
const UZ_MON = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const compact = (n) => (n >= 1e6 ? `${Math.round(n / 1e5) / 10}m` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : n ? String(Math.round(n)) : '');
const fm = (n) => `${n < 0 ? '−' : ''}${money(Math.abs(n))}`;
const KIND_ICON = { site: '🌐', bot: '🤖', video: '🎬', sub: '🔁', other: '📦', tr: '🔄' };
const CAT_ICON = { ads: '📣', team: '👥', host: '🌐', tools: '🧰', other: '📦' };
const W_ICON = { cash: '💵', card: '💳', usd: '💲' };

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

// Hisob-kitob: hamyonlar (naqd, karta, dollar), kunlik kurs, kirim, chiqim, foyda, oylar dinamikasi, amallar daftari
export default function LedgerView({ projects, subs, expenses, payables, today, onAddIncome, onAddExpense, onDelete, bal, onSetBalance, onTransfer, onDefWallet, onWalletOp, fx }) {
  const [per, setPer] = useState('month');
  const [flt, setFlt] = useState('all');
  const [limit, setLimit] = useState(25);
  const rate = fx && fx.usd ? fx.usd : getRate();
  const def = (bal && bal.def) || 'cash';
  const all = useMemo(() => ledgerOf(projects, subs, expenses, def), [projects, subs, expenses, def, rate]);
  const s = useMemo(() => summarize(all, per, today), [all, per, today, rate]);
  const series = useMemo(() => monthly(all, 6, today), [all, today, rate]);
  const bn = useMemo(() => balances(bal, all, today), [bal, all, today, rate]);
  const debt = projects.reduce((n, p) => n + owed(p), 0);
  const ps = paySummary(payables, projects, subs, today), toPay = ps.total;
  const usdDebt = payables.reduce((n, x) => n + (x.cu === 'USD' ? payLeft(x) : 0), 0);
  const usdBal = bn && bn.wallets.usd ? bn.wallets.usd.balance : null;
  const names = t('months'), kinds = t('stKinds'), cats = t('exCats'), wn = t('wlNames');
  const max = Math.max(1, ...series.map((x) => Math.max(x.inc, x.exp)));
  const list = s.list.filter((x) => flt === 'all' || x.dir === flt);
  const ratio = s.income + s.expense > 0 ? (s.income / (s.income + s.expense)) * 100 : 50;
  const mname = (m) => (getLang() === 'uz' ? UZ_MON[Number(m.slice(5)) - 1] : String(names[Number(m.slice(5)) - 1]).slice(0, 3));
  void leftUzs;

  return (
    <>
      <section className={`ld-balance${bn ? '' : ' empty'}`}>
        <div className="ld-bal-head"><small>💵 {t('blCard')}</small>{rate > 0 && <span className="ld-fx">$1 = {fmtUzs(rate)}</span>}</div>
        {bn ? <b className={bn.total < 0 ? 'neg' : ''}>{fm(bn.total)}</b> : <p>{t('blNo')}</p>}
        <div className="ld-wallets">
          {WAL.map((w) => {
            const y = bn && bn.wallets[w];
            return (
              <div key={w} className={`ld-wallet${y ? '' : ' none'}`}>
                <button type="button" className="ld-w-body" onClick={() => onSetBalance(w)} aria-label={`${wn[w]}: ${t('blEdit')}`}>
                  <span className="ld-w-ico">{W_ICON[w]}</span>
                  <span className="ld-w-main">
                    <b>{wn[w]}</b>
                    {y ? <small>{y.inc || y.out ? `+${fmtW(w, y.inc)} / −${fmtW(w, y.out)}` : t('blEdit')}</small> : <small>{t('blSet')}</small>}
                  </span>
                  <span className="ld-w-sum">
                    {y ? <strong className={y.balance < 0 ? 'neg' : ''}>{fmtW(w, y.balance)}</strong> : <strong>＋</strong>}
                    {y && w === 'usd' && rate > 0 && <small>≈ {fmtUzs(y.balance * rate)}</small>}
                  </span>
                </button>
                {y && (
                  <span className="ld-w-ops">
                    <button type="button" className="ld-op plus" onClick={() => onWalletOp('in', w)} aria-label={`${wn[w]} +`}>＋</button>
                    <button type="button" className="ld-op minus" onClick={() => onWalletOp('out', w)} aria-label={`${wn[w]} −`}>－</button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {(usdBal !== null || usdDebt > 0) && (
          <div className="ld-usd">
            {usdBal !== null && <span>💲 {t('ldUsdHave')}: <b>{fmtUsd(usdBal)}</b></span>}
            {usdDebt > 0 && <span>🧾 {t('ldUsdDebt')}: <b className="neg">{fmtUsd(usdDebt)}</b></span>}
            {usdBal !== null && usdDebt > 0 && <span>= <b className={usdBal - usdDebt < 0 ? 'neg' : 'pos'}>{fmtUsd(usdBal - usdDebt)}</b> {t('ldUsdNet')}</span>}
          </div>
        )}
        {bn && ps.out30 > 0 && <span className="ld-bal-due">{t('blDue')}: −{money(ps.out30)} → <strong className={bn.total - ps.out30 < 0 ? 'neg' : ''}>{t('blAfter')}: {fm(bn.total - ps.out30)}</strong></span>}
        {bn && (
          <div className="ld-def">
            <small>{t('wlDef')}</small>
            <Choice value={def} onChange={onDefWallet} options={[{ v: 'cash', label: wn.cash }, { v: 'card', label: wn.card }]} />
          </div>
        )}
      </section>

      <div className="ld-actions three">
        <button type="button" className="btn btn-primary" onClick={onAddIncome}>＋ {t('hsAddIn')}</button>
        <button type="button" className="btn btn-accent" onClick={onAddExpense}>－ {t('hsAddOut')}</button>
        <button type="button" className="btn btn-ghost" onClick={onTransfer}>🔄 {t('trShort')}</button>
      </div>

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
      </section>

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
          {[['all', 'hsAll'], ['in', 'hsIn'], ['out', 'hsOut'], ['tr', 'trShort']].map(([k, l]) => <button type="button" key={k} className={`cat-chip${flt === k ? ' on' : ''}`} onClick={() => setFlt(k)}>{t(l)}</button>)}
        </div>
      </div>
      {list.length === 0 ? <p className="empty small">{t('hsNone')}</p> : (
        <ul className="ld-list">
          {list.slice(0, limit).map((x) => (
            <li key={x.id}>
              <span className={`ld-ico ${x.dir}`}>{x.dir === 'tr' ? '🔄' : x.dir === 'in' ? KIND_ICON[x.kind] || '📦' : CAT_ICON[x.kind] || '📦'}</span>
              <span className="ld-main">
                <b>{x.dir === 'tr' ? `${wn[x.w]} → ${wn[x.w2]}` : x.label || (x.dir === 'in' ? kinds[x.kind] : cats[x.kind]) || '—'}</b>
                <small>{x.d.slice(8)}.{x.d.slice(5, 7)}.{x.d.slice(0, 4)}{x.auto ? ` · ${t('hsAuto')}` : ''}{x.dir !== 'tr' && x.w !== 'cash' ? ` · ${W_ICON[x.w]} ${wn[x.w]}` : ''}</small>
              </span>
              {x.dir === 'tr' ? <strong>{fmtW(x.w, x.a)} → {fmtW(x.w2, x.a2)}</strong> : <strong className={x.dir === 'in' ? 'pos' : 'neg'}>{x.dir === 'in' ? '+' : '−'}{fmtW(x.w, x.a)}</strong>}
              {!x.auto && <button type="button" className="icon-btn" onClick={() => onDelete(x.id)} aria-label={t('dDelete')}>✕</button>}
            </li>
          ))}
        </ul>
      )}
      {list.length > limit && <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setLimit(limit + 25)}>{t('hsMore')}</button>}
      {rate > 0 && fx && fx.d && <p className="auto-note" style={{ marginTop: 12 }}>💱 $1 = {fmtUzs(rate)} · {t('fxSrc')} · {fx.d}</p>}
    </>
  );
}
