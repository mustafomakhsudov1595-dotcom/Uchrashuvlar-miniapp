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
export const ITag = P(<><path d="M3 12.2V4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-7.2 7.2a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7z" /><circle cx="8" cy="8" r="1.3" /></>);
export const IRefresh = P(<><path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" /></>);
export const IPhone = P(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />);
export const IPin = P(<><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const ILock = P(<><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const IOut = P(<><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" /><path d="m16 8 4 4-4 4M20 12H9" /></>);
export const IUser = P(<><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></>);
