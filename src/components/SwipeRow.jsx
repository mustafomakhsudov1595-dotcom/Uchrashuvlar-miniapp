import { useRef, useState } from 'react';

// Qatorni o'ngga surish — "bajarildi", chapga surish — "o'chirish".
const MAX = 132;
const TRIGGER = 88;

export default function SwipeRow({ children, onRight, onLeft, rightLabel, leftLabel, rightIcon, leftIcon, disabled = false }) {
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const st = useRef(null);
  const moved = useRef(false);

  const down = (e) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    st.current = { x: e.clientX, y: e.clientY, lock: null };
    moved.current = false;
  };
  const move = (e) => {
    const s = st.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (s.lock === null) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      s.lock = Math.abs(mx) > Math.abs(my) * 1.3 ? 'x' : 'y';
      if (s.lock === 'x') {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setDrag(true);
      }
    }
    if (s.lock !== 'x') return;
    moved.current = true;
    const v = Math.max(-MAX, Math.min(MAX, mx));
    setDx(v);
  };
  const up = () => {
    const s = st.current;
    st.current = null;
    if (!s || s.lock !== 'x') return;
    setDrag(false);
    const v = dx;
    setDx(0);
    if (v > TRIGGER && onRight) onRight();
    else if (v < -TRIGGER && onLeft) onLeft();
  };

  const rightOn = dx > 8;
  const leftOn = dx < -8;
  return (
    <div className="swipe">
      <div className={`swipe-bg right${dx > TRIGGER ? ' armed' : ''}`} style={{ opacity: rightOn ? 1 : 0 }}>
        {rightIcon}
        <span>{rightLabel}</span>
      </div>
      <div className={`swipe-bg left${dx < -TRIGGER ? ' armed' : ''}`} style={{ opacity: leftOn ? 1 : 0 }}>
        <span>{leftLabel}</span>
        {leftIcon}
      </div>
      <div
        className={`swipe-fg${drag ? ' dragging' : ''}${dx ? ' moved' : ''}`}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={(e) => {
          if (moved.current) {
            e.stopPropagation();
            e.preventDefault();
            moved.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
