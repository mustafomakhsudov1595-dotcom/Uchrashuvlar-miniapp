// Kichik SVG ikonkalar. currentColor ishlatadi, shuning uchun rangi matn rangidan olinadi.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

const make = (children) =>
  function Icon(props) {
    return (
      <svg {...base} {...props}>
        {children}
      </svg>
    );
  };

export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconList = make(
  <>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </>,
);
export const IconCalendar = make(
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
);
export const IconPin = make(
  <>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </>,
);
export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);
export const IconCheck = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconTrash = make(<path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5" />);
export const IconEdit = make(
  <>
    <path d="M4 20l.9-4.1L16.3 4.5a2.2 2.2 0 0 1 3.1 3.1L8 19.1z" />
    <path d="M14.5 6.3l3.2 3.2" />
  </>,
);
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />);
export const IconChevronLeft = make(<path d="M14.5 6l-6 6 6 6" />);
export const IconChevronRight = make(<path d="M9.5 6l6 6-6 6" />);
export const IconExternal = make(<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />);
