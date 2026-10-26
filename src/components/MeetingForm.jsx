import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import { IconClose, IconStar } from './Icons.jsx';
import { CATS } from '../lib/meetings.js';
import { t } from '../lib/i18n.js';
import { defaultTime, todayISO } from '../lib/dates.js';
import { newId } from '../lib/meetings.js';
import { haptic } from '../lib/telegram.js';

// Yangi uchrashuv qo'shish yoki mavjudini tahrirlash formasi.
export default function MeetingForm({ initial, presetDate, favorites = [], recent = [], onToggleFav, onSave, onClose }) {
  const uid = useId();
  const [f, setF] = useState(() => ({
    name: initial?.name ?? '',
    date: initial?.date ?? presetDate ?? todayISO(),
    time: initial?.time ?? defaultTime(),
    location: initial?.location ?? '',
    phone: initial?.phone ?? '',
    cat: initial?.cat ?? '',
    notes: initial?.notes ?? '',
  }));
  const [items, setItems] = useState(() => initial?.checklist ?? []);
  const [draft, setDraft] = useState('');
  const [errors, setErrors] = useState({});

  // Maydonga yozilganda uning xatosi yo'qoladi.
  const set = (key) => (e) => {
    const { value } = e.target;
    setF((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    haptic.select();
    setItems((prev) => [...prev, { id: newId(), text: text.slice(0, 80), done: false }]);
    setDraft('');
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = t('eName');
    if (!f.date) errs.date = t('eDate');
    if (!f.time) errs.time = t('eTime');
    setErrors(errs);
    if (Object.keys(errs).length) {
      haptic.error();
      return;
    }
    const checklist = [...items];
    const pending = draft.trim();
    // Yozib qo'yilgan, lekin "Qo'shish" bosilmagan narsa yo'qolib ketmasin.
    if (pending) checklist.push({ id: newId(), text: pending.slice(0, 80), done: false });
    onSave({
      name: f.name.trim(),
      date: f.date,
      time: f.time,
      location: f.location.trim(),
      // Joy matni o'zgarsa, botdan kelgan koordinatalar eskirgan hisoblanadi.
      ...(f.location.trim() === (initial?.location ?? '') ? {} : { lat: null, lon: null }),
      phone: f.phone.trim(),
      cat: f.cat,
      notes: f.notes.trim(),
      checklist,
    });
  };

  const formId = `${uid}-form`;
  const isFav = favorites.includes(f.location.trim());

  return (
    <Sheet
      title={initial ? t('fEdit') : t('fNew')}
      onClose={onClose}
      tall
      dismissOnOverlay={false}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('fCancel')}
          </button>
          <button type="submit" form={formId} className="btn btn-primary">
            {t('fSave')}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-name`}>{t('fWho')}</label>
          <input
            id={`${uid}-name`}
            className="input"
            value={f.name}
            onChange={set('name')}
            placeholder={t('fWhoPh')}
            maxLength={80}
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${uid}-name-err` : undefined}
          />
          {errors.name && (
            <span className="error" id={`${uid}-name-err`}>
              {errors.name}
            </span>
          )}
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor={`${uid}-date`}>{t('fDate')}</label>
            <input
              id={`${uid}-date`}
              type="date"
              className="input"
              value={f.date}
              onChange={set('date')}
              aria-invalid={Boolean(errors.date)}
            />
            {errors.date && <span className="error">{errors.date}</span>}
          </div>
          <div className="field">
            <label htmlFor={`${uid}-time`}>{t('fTime')}</label>
            <input
              id={`${uid}-time`}
              type="time"
              className="input"
              value={f.time}
              onChange={set('time')}
              aria-invalid={Boolean(errors.time)}
            />
            {errors.time && <span className="error">{errors.time}</span>}
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${uid}-loc`}>{t('fPlace')}</label>
          <div className="add-row">
            <input
              id={`${uid}-loc`}
              className="input"
              value={f.location}
              onChange={set('location')}
              placeholder={t('fPlacePh')}
              maxLength={120}
              autoComplete="off"
            />
            {f.location.trim() && (
              <button
                type="button"
                className={`icon-btn star${isFav ? ' on' : ''}`}
                onClick={() => {
                  haptic.select();
                  onToggleFav?.(f.location.trim());
                }}
                aria-pressed={isFav}
                aria-label={isFav ? t('fUnstar') : t('fStar')}
                title={isFav ? t('fUnstar') : t('fStar')}
              >
                <IconStar width={22} height={22} />
              </button>
            )}
          </div>
          {(favorites.length > 0 || recent.length > 0) && (
            <div className="place-chips">
              {favorites.map((p) => (
                <button type="button" key={`f-${p}`} className="place-chip fav" onClick={() => setF((prev) => ({ ...prev, location: p }))}>
                  ★ {p}
                </button>
              ))}
              {recent.filter((p) => !favorites.includes(p)).map((p) => (
                <button type="button" key={`r-${p}`} className="place-chip" onClick={() => setF((prev) => ({ ...prev, location: p }))}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${uid}-phone`}>{t('fPhone')}</label>
          <input
            id={`${uid}-phone`}
            className="input"
            type="tel"
            inputMode="tel"
            value={f.phone}
            onChange={set('phone')}
            placeholder={t('fPhonePh')}
            maxLength={30}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <span className="label-like">{t('fCat')}</span>
          <div className="cat-chips" role="radiogroup" aria-label={t('fCat')}>
            <button type="button" role="radio" aria-checked={f.cat === ''} className={`cat-chip${f.cat === '' ? ' on' : ''}`} onClick={() => setF((p) => ({ ...p, cat: '' }))}>
              {t('fNoCat')}
            </button>
            {CATS.map((c) => (
              <button type="button" key={c} role="radio" aria-checked={f.cat === c} className={`cat-chip cat-${c}${f.cat === c ? ' on' : ''}`} onClick={() => { haptic.select(); setF((p) => ({ ...p, cat: c })); }}>
                <i className="cat-dot" />
                {t('cats')[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${uid}-draft`}>{t('fBring')}</label>
          {items.length > 0 && (
            <ul className="check-edit">
              {items.map((i) => (
                <li className="check-item" key={i.id}>
                  <span>{i.text}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeItem(i.id)}
                    aria-label={`${i.text} — ${t('fRemoveItem')}`}
                  >
                    <IconClose width={18} height={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="add-row">
            <input
              id={`${uid}-draft`}
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder={t('fBringPh')}
              maxLength={80}
              autoComplete="off"
              enterKeyHint="done"
            />
            <button type="button" className="btn btn-accent add-btn" onClick={addItem}>
              {t('fAddItem')}
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${uid}-notes`}>{t('fNotes')}</label>
          <textarea
            id={`${uid}-notes`}
            className="input"
            value={f.notes}
            onChange={set('notes')}
            placeholder={t('fNotesPh')}
            maxLength={1000}
            rows={4}
          />
        </div>
      </form>
    </Sheet>
  );
}
