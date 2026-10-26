import { useMemo } from 'react';

// Kichik bayram animatsiyasi: `burst` qiymati o'zgarganda qayta ishga tushadi.
const COLORS = ['var(--a1)', 'var(--a2)', '#ffd166', '#ff6b8b', '#7cf0c4', '#ffffff'];

export default function Confetti({ burst }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2 + Math.random() * 0.6;
        const d = 90 + Math.random() * 150;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d - 60, r: Math.random() * 540 - 270, c: COLORS[i % COLORS.length], s: 6 + Math.random() * 6, dl: Math.random() * 80 };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst],
  );
  if (!burst) return null;
  return (
    <div className="confetti" key={burst} aria-hidden="true">
      {parts.map((p, i) => (
        <i key={i} style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`, background: p.c, width: p.s, height: p.s * 0.6, animationDelay: `${p.dl}ms` }} />
      ))}
    </div>
  );
}
