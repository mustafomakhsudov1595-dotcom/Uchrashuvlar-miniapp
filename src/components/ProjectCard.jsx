import SwipeRow from './SwipeRow.jsx';
import { IconBot, IconBox, IconCheck, IconFilm, IconGlobe, IconTrash } from './Icons.jsx';
import { progress, urgency } from '../lib/projects.js';
import { t } from '../lib/i18n.js';

export const TypeIcon = ({ type, ...p }) => (type === 'site' ? <IconGlobe {...p} /> : type === 'bot' ? <IconBot {...p} /> : type === 'video' ? <IconFilm {...p} /> : <IconBox {...p} />);

export function urgencyText(u) {
  return u.kind === 'done' ? t('pDoneTag') : u.kind === 'over' ? t('pOverTag', u.n) : u.kind === 'today' ? t('pToday') : u.n === 1 ? t('pTomorrow') : t('pLeftTag', u.n);
}

export default function ProjectCard({ project: p, today, onOpen, onDone, onDelete }) {
  const g = progress(p);
  const u = urgency(p, today);
  const body = (
    <button type="button" className={`pcard pt-${p.type}${p.status === 'done' ? ' fin' : ''}`} onClick={() => onOpen(p.id)}>
      <span className="ptile">
        <TypeIcon type={p.type} width={24} height={24} />
      </span>
      <span className="pmain">
        <span className="pname">{p.name}</span>
        <span className="psub">
          {p.client ? `${p.client} · ` : ''}
          {t('pTypes')[p.type]}
        </span>
        <span className="pprog">
          <span className="bar"><i style={{ width: `${g.pct}%` }} /></span>
          <small>{g.done}/{g.total}</small>
        </span>
      </span>
      <span className="pside">
        <span className={`urg ${u.kind}`}>{urgencyText(u)}</span>
        <span className="pstat">{t('pStatus')[p.status]}</span>
      </span>
    </button>
  );
  if (!onDone && !onDelete) return body;
  return (
    <SwipeRow
      onRight={p.status === 'done' ? undefined : () => onDone(p.id)}
      onLeft={() => onDelete(p.id)}
      rightLabel={t('pStatus').done}
      leftLabel={t('swDelete')}
      rightIcon={<IconCheck width={20} height={20} strokeWidth={2.6} />}
      leftIcon={<IconTrash width={20} height={20} />}
    >
      {body}
    </SwipeRow>
  );
}
