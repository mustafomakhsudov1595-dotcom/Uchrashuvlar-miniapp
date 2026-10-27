import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { TypeIcon, urgencyText } from './ProjectCard.jsx';
import { IconCheck, IconClose, IconEdit, IconPhone, IconTrash } from './Icons.jsx';
import { progress, PSTATUS, urgency } from '../lib/projects.js';
import { formatFull, formatShort } from '../lib/dates.js';
import { todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

const R = 28;
const C = 2 * Math.PI * R;
const money = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function ProjectDetail({ project: p, onClose, onEdit, onDelete, onStatus, onToggleTask, onRemoveTask, onAddTask, onShift }) {
  const [text, setText] = useState('');
  const g = progress(p);
  const u = urgency(p, todayISO());
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onAddTask(v);
    setText('');
  };
  const tel = p.contact && /[\d]{7,}/.test(p.contact.replace(/\D/g, '')) ? p.contact.replace(/[^\d+]/g, '') : '';

  return (
    <Sheet
      title={t('pjTitle')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            <IconTrash width={20} height={20} />
            {t('dDelete')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            <IconEdit width={20} height={20} />
            {t('dEdit')}
          </button>
        </>
      }
    >
      <div className={`d-hero pj-hero pt-${p.type}`}>
        <div className="pj-top">
          <span className="ptile big"><TypeIcon type={p.type} width={28} height={28} /></span>
          <span className="pj-ring" aria-label={`${g.pct}%`}>
            <svg viewBox="0 0 70 70">
              <circle cx="35" cy="35" r={R} className="ring-bg" />
              <circle cx="35" cy="35" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - g.pct / 100)} />
            </svg>
            <b>{g.pct}%</b>
          </span>
        </div>
        <h3 className="d-name">{p.name}</h3>
        <p className="d-status">
          {p.client ? `${p.client} · ` : ''}
          {t('pTypes')[p.type]}
        </p>
        <p className={`pj-due ${u.kind}`}>
          {formatFull(p.date)} · {urgencyText(u)}
        </p>
      </div>

      <div className="section-title"><h4>{t('lblStatus')}</h4></div>
      <div className="status-row" role="radiogroup" aria-label={t('lblStatus')}>
        {PSTATUS.map((s) => (
          <button type="button" key={s} role="radio" aria-checked={p.status === s} className={`st-btn st-${s}${p.status === s ? ' on' : ''}`} onClick={() => onStatus(s)}>
            {t('pStatus')[s]}
          </button>
        ))}
      </div>

      <div className="section-title"><h4>{t('pjShiftLabel')}</h4></div>
      <div className="shift-row">
        {[1, 3, 7].map((n) => (
          <button type="button" key={n} className="act-chip" onClick={() => onShift(n)}>{t('pjShift', n)}</button>
        ))}
        <button type="button" className="act-chip" onClick={() => onShift(-1)}>−1</button>
      </div>

      <div className="section-title">
        <h4>{t('lblTasks')}</h4>
        <span className="count">{g.done}/{g.total}</span>
      </div>
      {p.tasks.length > 0 && (
        <ul className="list">
          {p.tasks.map((task) => {
            const late = !task.done && task.due && task.due < todayISO();
            return (
              <li key={task.id} className="task-row">
                <button type="button" role="checkbox" aria-checked={task.done} className="todo" onClick={() => onToggleTask(task.id)}>
                  <span className="box">{task.done && <IconCheck width={16} height={16} strokeWidth={3} />}</span>
                  <span className="todo-text">{task.text}</span>
                </button>
                {task.due && <span className={`due${late ? ' late' : ''}`}>{formatShort(task.due)}</span>}
                <button type="button" className="icon-btn" onClick={() => onRemoveTask(task.id)} aria-label={t('fRemoveItem')}>
                  <IconClose width={16} height={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="add-row" style={{ marginTop: 10 }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={t('pjTaskPh')} maxLength={120} enterKeyHint="done" />
        <button type="button" className="btn btn-accent add-btn" onClick={add}>{t('fAddItem')}</button>
      </div>

      {(p.client || p.contact || p.price !== null) && (
        <>
          <div className="section-title"><h4>{t('lblClient')}</h4></div>
          <div className="info">
            {p.client && (
              <div className="info-row">
                <TypeIcon type={p.type} />
                <div><div className="info-label">{t('lblClient')}</div><div className="info-value">{p.client}</div></div>
              </div>
            )}
            {p.contact && (
              <div className="info-row">
                <IconPhone />
                <div>
                  <div className="info-label">{t('lblContact')}</div>
                  <div className="info-value">{p.contact}</div>
                  {tel && <a className="map-link" href={`tel:${tel}`}>{t('dCall')}</a>}
                </div>
              </div>
            )}
            {p.price !== null && (
              <div className="info-row">
                <IconCheck />
                <div>
                  <div className="info-label">{t('lblPrice')}</div>
                  <div className="info-value">{money(p.price)}{p.paid !== null ? ` · ${t('lblPaid')}: ${money(p.paid)}` : ''}</div>
                  {p.paid !== null && p.price > 0 && <span className="bar big" style={{ marginTop: 8 }}><i style={{ width: `${Math.min(100, (p.paid / p.price) * 100)}%` }} /></span>}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {p.notes && (
        <>
          <div className="section-title"><h4>{t('dNotes')}</h4></div>
          <p className="notes">{p.notes}</p>
        </>
      )}
    </Sheet>
  );
}
