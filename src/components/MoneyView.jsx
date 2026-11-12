import { useState } from 'react';
import PayablesView from './PayablesView.jsx';
import StatsView, { IncomeCard } from './StatsView.jsx';
import { IconSettings } from './Icons.jsx';
import { t } from '../lib/i18n.js';

// "Pul" boʻlimi: Chiqim | Daromad | Statistika
export default function MoneyView({ payables, projects, subs, expenses, goal, meetings, today, now, onOpenPayable, onAddPayable, onPayNow, onAddExpense, onDeleteExpense, onSetGoal, onSettings, initial = 'pay' }) {
  const [view, setView] = useState(initial);
  const tabs = [['pay', 'fvPay'], ['income', 'mnIncome'], ['stats', 'tabStats']];
  const seg = (
    <div className="seg seg3" role="tablist">
      {tabs.map(([k, l]) => (
        <button type="button" key={k} role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{t(l)}</button>
      ))}
    </div>
  );
  if (view === 'stats') {
    return <StatsView meetings={meetings} projects={projects} subs={subs} expenses={expenses} goal={goal} noIncome top={seg} now={now} onSettings={onSettings} />;
  }
  return (
    <>
      <header className="home-head">
        <div>
          <p className="greet">{t('mnTitle')}</p>
          <h1>{view === 'pay' ? t('pvTitle') : t('mnIncome')}</h1>
        </div>
        <div className="head-btns">
          <button type="button" className="round-btn" onClick={onSettings} aria-label={t('sTitle')}><IconSettings width={20} height={20} /></button>
        </div>
      </header>
      {seg}
      {view === 'pay' && <PayablesView payables={payables} projects={projects} subs={subs} today={today} onOpen={onOpenPayable} onAdd={onAddPayable} onPay={onPayNow} />}
      {view === 'income' && <IncomeCard projects={projects} subs={subs} expenses={expenses} goal={goal} onAddExpense={onAddExpense} onDeleteExpense={onDeleteExpense} onSetGoal={onSetGoal} />}
    </>
  );
}
