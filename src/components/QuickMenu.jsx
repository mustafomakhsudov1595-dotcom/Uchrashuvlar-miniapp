import Sheet from './Sheet.jsx';
import { IconCalendar, IconFolder, IconWallet, IconChart, IconBell, IconGlobe } from './Icons.jsx';
import { t } from '../lib/i18n.js';

// "+" bosilganda chiqadigan tez qoʻshish menyusi.
export default function QuickMenu({ onPick, onClose }) {
  const items = [
    ['pay', IconWallet, t('qmPay'), t('qmPayS'), 'hot'],
    ['expense', IconChart, t('qmExp'), t('qmExpS')],
    ['meeting', IconCalendar, t('qmMeet'), t('qmMeetS')],
    ['project', IconFolder, t('qmProj'), t('qmProjS')],
    ['sub', IconBell, t('qmSub'), t('qmSubS')],
    ['service', IconGlobe, t('qmSvc'), t('qmSvcS')],
  ];
  return (
    <Sheet title={t('qmTitle')} onClose={onClose}>
      <div className="qm-grid">
        {items.map(([k, Icon, name, sub, cls]) => (
          <button type="button" key={k} className={`qm-tile ${cls || ''}`} onClick={() => onPick(k)}>
            <span className="qm-ico"><Icon width={22} height={22} /></span>
            <b>{name}</b>
            <small>{sub}</small>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
