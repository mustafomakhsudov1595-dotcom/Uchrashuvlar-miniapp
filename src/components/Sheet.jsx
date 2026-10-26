import { useEffect, useRef } from 'react';
import { IconClose } from './Icons.jsx';
import { t } from '../lib/i18n.js';

// Pastdan chiqadigan oyna. Yopish (Esc, orqaga tugmasi) App.jsx'da boshqariladi.
export default function Sheet({ title, onClose, children, footer, tall = false, dismissOnOverlay = true }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (dismissOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`sheet${tall ? ' tall' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <IconClose />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
