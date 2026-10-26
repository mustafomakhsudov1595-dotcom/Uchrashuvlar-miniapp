import { IconCalendar, IconChart, IconHome, IconPlus, IconSettings } from './Icons.jsx';
import { t } from '../lib/i18n.js';

// Suzuvchi shisha menyu: markazda "+" tugmasi.
export default function TabBar({ tab, onTab, onAdd, onSettings }) {
  const item = (key, Icon, label) => (
    <button type="button" className="tab" aria-current={tab === key ? 'page' : undefined} onClick={() => onTab(key)}>
      <Icon width={22} height={22} />
      <span>{label}</span>
    </button>
  );
  return (
    <nav className="tabbar" aria-label={t('menu')}>
      <div className="tabbar-inner">
        {item('home', IconHome, t('tabHome'))}
        {item('calendar', IconCalendar, t('tabCalendar'))}
        <button type="button" className="fab" aria-label={t('tabAdd')} onClick={onAdd}>
          <IconPlus width={26} height={26} strokeWidth={2.4} />
        </button>
        {item('stats', IconChart, t('tabStats'))}
        <button type="button" className="tab" onClick={onSettings}>
          <IconSettings width={22} height={22} />
          <span>{t('tabSettings')}</span>
        </button>
      </div>
    </nav>
  );
}
