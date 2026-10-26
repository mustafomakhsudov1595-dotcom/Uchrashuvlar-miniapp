// Bo'sh kun uchun kichik vektor tasvir (kalendar + yulduzchalar).
export default function Illustration() {
  return (
    <svg className="illu" viewBox="0 0 160 130" aria-hidden="true">
      <defs>
        <linearGradient id="il-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--a1)" />
          <stop offset="1" stopColor="var(--a2)" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="118" rx="52" ry="7" className="illu-shadow" />
      <rect x="30" y="26" width="100" height="84" rx="20" className="illu-card" />
      <path d="M30 56h100" className="illu-line" />
      <rect x="30" y="26" width="100" height="30" rx="20" fill="url(#il-g)" opacity=".9" />
      <rect x="30" y="44" width="100" height="12" fill="url(#il-g)" opacity=".9" />
      <path d="M56 18v18M104 18v18" stroke="var(--text)" strokeWidth="6" strokeLinecap="round" opacity=".85" />
      <circle cx="58" cy="78" r="6" className="illu-dot" />
      <circle cx="80" cy="78" r="6" className="illu-dot" />
      <circle cx="102" cy="78" r="6" className="illu-dot a" />
      <circle cx="58" cy="97" r="6" className="illu-dot" />
      <circle cx="80" cy="97" r="6" className="illu-dot" />
      <path d="M130 14l2.6 6.4 6.4 2.6-6.4 2.6-2.6 6.4-2.6-6.4-6.4-2.6 6.4-2.6z" fill="url(#il-g)" className="illu-star" />
      <path d="M22 70l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="url(#il-g)" className="illu-star s2" />
    </svg>
  );
}
