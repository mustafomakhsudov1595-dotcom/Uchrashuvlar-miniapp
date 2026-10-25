import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import { IconClose } from './Icons.jsx';
import { defaultTime, todayISO } from '../lib/dates.js';
import { newId } from '../lib/meetings.js';
import { haptic } from '../lib/telegram.js';

// Yangi uchrashuv qo'shish yoki mavjudini tahrirlash formasi.
export default function MeetingForm({ initial, presetDate, onSave, onClose }) {
  const uid = useId();
  const [f, setF] = useState(() => ({
    name: initial?.name ?? '',
    date: initial?.date ?? presetDate ?? todayISO(),
    time: initial?.time ?? defaultTime(),
    location: initial?.location ?? '',
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
    if (!f.name.trim()) errs.name = 'Ismni kiriting.';
    if (!f.date) errs.date = 'Sanani tanlang.';
    if (!f.time) errs.time = 'Vaqtni tanlang.';
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
      notes: f.notes.trim(),
      checklist,
    });
  };

  const formId = `${uid}-form`;

  return (
    <Sheet
      title={initial ? 'Uchrashuvni tahrirlash' : 'Yangi uchrashuv'}
      onClose={onClose}
      tall
      dismissOnOverlay={false}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" form={formId} className="btn btn-primary">
            Saqlash
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-name`}>Kim bilan uchrashasiz?</label>
          <input
            id={`${uid}-name`}
            className="input"
            value={f.name}
            onChange={set('name')}
            placeholder="Masalan, Aziz Karimov"
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
            <label htmlFor={`${uid}-date`}>Sana</label>
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
            <label htmlFor={`${uid}-time`}>Vaqt</label>
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
          <label htmlFor={`${uid}-loc`}>Joy</label>
          <input
            id={`${uid}-loc`}
            className="input"
            value={f.location}
            onChange={set('location')}
            placeholder="Masalan, Amir Temur xiyoboni yonidagi kafe"
            maxLength={120}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor={`${uid}-draft`}>Olib borish yoki berish kerak</label>
          {items.length > 0 && (
            <ul className="check-edit">
              {items.map((i) => (
                <li className="check-item" key={i.id}>
                  <span>{i.text}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeItem(i.id)}
                    aria-label={`${i.text} — olib tashlash`}
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
              placeholder="Masalan, shartnoma nusxasi"
              maxLength={80}
              autoComplete="off"
              enterKeyHint="done"
            />
            <button type="button" className="btn btn-accent add-btn" onClick={addItem}>
              Qoʻshish
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${uid}-notes`}>Izoh</label>
          <textarea
            id={`${uid}-notes`}
            className="input"
            value={f.notes}
            onChange={set('notes')}
            placeholder="Mavzu, telefon raqami, muhim eslatmalar"
            maxLength={1000}
            rows={4}
          />
        </div>
      </form>
    </Sheet>
  );
}
