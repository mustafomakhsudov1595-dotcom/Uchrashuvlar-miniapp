import { IconCalendar, IconList, IconPlus } from './Icons.jsx';
import { t } from '../lib/i18n.js';

export default function TabBar({ tab, onTab, onAdd }) {
  return (
    <nav className="tabbar" aria-label={t('menu')}>
      <div className="tabbar-inner">
        <button
          type="button"
          className="tab"
          aria-current={tab === 'upcoming' ? 'page' : undefined}
          onClick={() => onTab('upcoming')}
        >
          <IconList width={24} height={24} />
          <span>{t('tabUpcoming')}</span>
        </button>
        <button type="button" className="fab" aria-label={t('tabAdd')} onClick={onAdd}>
          <IconPlus width={26} height={26} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className="tab"
          aria-current={tab === 'calendar' ? 'page' : undefined}
          onClick={() => onTab('calendar')}
        >
          <IconCalendar width={24} height={24} />
          <span>{t('tabCalendar')}</span>
        </button>
      </div>
    </nav>
  );
}
