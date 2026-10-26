import { useEffect, useRef, useState } from 'react';
import { IconClose } from './Icons.jsx';
import { t } from '../lib/i18n.js';

// Pastdan chiqadigan oyna. Tutqichdan pastga surib yopiladi. Yopish (Esc, orqaga tugmasi) App.jsx'da boshqariladi.
export default function Sheet({ title, onClose, children, footer, tall = false, dismissOnOverlay = true, tone = '' }) {
  const ref = useRef(null);
  const [dy, setDy] = useState(0);
  const [drag, setDrag] = useState(false);
  const st = useRef(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const down = (e) => {
    st.current = { y: e.clientY, t: performance.now() };
    setDrag(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (!st.current) return;
    setDy(Math.max(0, e.clientY - st.current.y));
  };
  const up = () => {
    if (!st.current) return;
    const v = dy / Math.max(1, performance.now() - st.current.t);
    st.current = null;
    setDrag(false);
    if (dy > 120 || (dy > 50 && v > 0.6)) onClose();
    else setDy(0);
  };

  return (
    <div
      className="overlay"
      style={{ '--fade': Math.max(0.25, 1 - dy / 500) }}
      onMouseDown={(e) => {
        if (dismissOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`sheet${tall ? ' tall' : ''}${tone ? ` ${tone}` : ''}${drag ? ' dragging' : ''}`}
        style={{ transform: dy ? `translateY(${dy}px)` : undefined }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="sheet-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <i />
        </div>
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
