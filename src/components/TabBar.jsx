import { IconCalendar, IconChart, IconFolder, IconHome, IconPlus } from './Icons.jsx';
import { t } from '../lib/i18n.js';

// Suzuvchi shisha menyu: markazda "+" tugmasi.
export default function TabBar({ tab, onTab, onAdd }) {
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
        {item('projects', IconFolder, t('tabProjects'))}
        <button type="button" className="fab" aria-label={tab === 'projects' ? t('pjAdd') : t('tabAdd')} onClick={onAdd}>
          <IconPlus width={26} height={26} strokeWidth={2.4} />
        </button>
        {item('calendar', IconCalendar, t('tabCalendar'))}
        {item('stats', IconChart, t('tabStats'))}
      </div>
    </nav>
  );
}
