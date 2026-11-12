// Tanlash: tizimning xira ochiladigan roʻyxati oʻrniga chiroyli tugmalar.
export default function Choice({ value, options, onChange, label }) {
  return (
    <div className="choice" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.v} role="radio" aria-checked={String(value) === String(o.v)} className={`cat-chip${String(value) === String(o.v) ? ' on' : ''}`} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}
