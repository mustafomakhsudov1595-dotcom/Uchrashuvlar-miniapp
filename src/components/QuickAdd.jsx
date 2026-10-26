import { useEffect, useMemo, useState } from 'react';
import { IconSparkle, IconSend } from './Icons.jsx';
import { parseQuick } from '../lib/quick.js';
import { dayLabel } from '../lib/dates.js';
import { t } from '../lib/i18n.js';
import { haptic } from '../lib/telegram.js';

// Tez qo'shish satri: yozganingiz zahoti nima tushunilgani chiplar bilan ko'rinadi.
export default function QuickAdd({ now, onCreate, onOpenForm }) {
  const [text, setText] = useState('');
  const [focus, setFocus] = useState(false);
  const [i, setI] = useState(0);
  const examples = t('qaPlaceholders');

  useEffect(() => {
    if (text || focus) return undefined;
    const id = setInterval(() => setI((x) => (x + 1) % examples.length), 3800);
    return () => clearInterval(id);
  }, [text, focus, examples.length]);

  const r = useMemo(() => (text.trim() ? parseQuick(text) : null), [text]);
  const understood = r && (r.found.date || r.found.time);

  const submit = (e) => {
    e?.preventDefault();
    if (!r || !text.trim()) return;
    const data = { name: r.name || '', date: r.date, time: r.time, location: r.location || '', phone: r.phone || '', cat: r.cat || '', notes: r.notes || '' };
    if (data.name && data.date && data.time) onCreate(data);
    else onOpenForm(data);
    setText('');
    haptic.success();
  };

  return (
    <form className={`qa${focus ? ' focus' : ''}`} onSubmit={submit}>
      <div className="qa-row">
        <IconSparkle width={20} height={20} className="qa-ico" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={examples[i]}
          aria-label={t('qaHint')}
          enterKeyHint="send"
          autoComplete="off"
          maxLength={200}
        />
        <button type="submit" className="qa-go" disabled={!text.trim()} aria-label={t('qaSend')}>
          <IconSend width={18} height={18} />
        </button>
      </div>
      {r && (
        <div className="qa-chips" aria-live="polite">
          {understood ? (
            <>
              {r.date && <span className="qchip date">{t('chipDate')}: {dayLabel(r.date, now)}</span>}
              {r.time && <span className="qchip time">{t('chipTime')}: {r.time}</span>}
              {r.name && <span className="qchip">{t('chipName')}: {r.name}</span>}
              {r.location && <span className="qchip">{t('chipPlace')}: {r.location}</span>}
              {r.phone && <span className="qchip">{t('chipPhone')}: {r.phone}</span>}
              {r.cat && <span className={`qchip cat-${r.cat}`}><i className="cat-dot" />{t('cats')[r.cat]}</span>}
              {(!r.date || !r.time || !r.name) && <span className="qchip warn">{t('qaMore')}</span>}
            </>
          ) : (
            <span className="qchip warn">{t('qaMore')}</span>
          )}
        </div>
      )}
    </form>
  );
}
