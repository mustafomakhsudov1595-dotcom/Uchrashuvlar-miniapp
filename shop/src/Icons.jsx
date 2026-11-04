const P = (d) => ({ size = 22, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);
export const IHome = P(<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />);
export const IGrid = P(<><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>);
export const ICart = P(<><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6" /><circle cx="9" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></>);
export const IBox = P(<><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></>);
export const IInfo = P(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6h.01" /></>);
export const ISearch = P(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></>);
export const IPlus = P(<path d="M12 5v14M5 12h14" />);
export const IMinus = P(<path d="M5 12h14" />);
export const IClose = P(<path d="M6 6l12 12M18 6 6 18" />);
export const IChev = P(<path d="m9 6 6 6-6 6" />);
export const IBack = P(<path d="m15 6-6 6 6 6" />);
export const ICheck = P(<path d="m5 12.5 4.5 4.5L19 7.5" />);
