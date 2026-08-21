/**
 * Bộ icon nội bộ (stroke-based, 24x24) — tránh phải thêm thư viện icon.
 * Thêm icon mới: bổ sung path vào `paths` bên dưới.
 */

const paths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  tasks: (
    <>
      <path d="M9 5h10M9 12h10M9 19h10" />
      <path d="m3 5 1.5 1.5L7.5 3.5" />
      <path d="m3 12 1.5 1.5L7.5 10.5" />
      <path d="m3 19 1.5 1.5L7.5 17.5" />
    </>
  ),
  projects: (
    <>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" />
    </>
  ),
  employees: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 5.5a3.25 3.25 0 0 1 0 6.2" />
      <path d="M18 14.4a6.5 6.5 0 0 1 3.5 5.6" />
    </>
  ),
  messages: (
    <>
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3.2A8 8 0 1 1 21 12" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  attendance: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  reports: (
    <>
      <path d="M3 21h18" />
      <rect x="5" y="11" width="3.6" height="7" rx="1" />
      <rect x="10.2" y="6" width="3.6" height="12" rx="1" />
      <rect x="15.4" y="14" width="3.6" height="4" rx="1" />
    </>
  ),
  ai: (
    <>
      <path d="M12 3.2 13.9 8l4.9 1.9-4.9 1.9L12 16.6 10.1 11.8 5.2 9.9 10.1 8z" />
      <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.8a6 6 0 1 0-12 0c0 5-2 6.4-2 6.4h16s-2-1.4-2-6.4" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </>
  ),
  org: (
    <>
      <rect x="9" y="2.5" width="6" height="5" rx="1.2" />
      <rect x="2.5" y="16.5" width="6" height="5" rx="1.2" />
      <rect x="15.5" y="16.5" width="6" height="5" rx="1.2" />
      <path d="M12 7.5v4M5.5 16.5v-2.2a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v2.2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.4A8.5 8.5 0 0 1 9.6 4 8.5 8.5 0 1 0 20 14.4" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 3.9 2.5 17.4a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />
      <path d="M12 9v4.2M12 17h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
  chevronLeft: <path d="m14.5 5-6.5 7 6.5 7" />,
  chevronRight: <path d="m9.5 5 6.5 7-6.5 7" />,
  mapPin: (
    <>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3.5 2" />
    </>
  ),
  filter: <path d="M4 5h16M7 12h10M10.5 19h3" />,
  login: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M14 15.5 17.5 12 14 8.5M17 12H6.5" />
    </>
  ),
  send: <path d="M4.5 12 20 4.5 15 19.5l-3.4-6.6L4.5 12Zm0 0 7.1.9" />,
  shield: (
    <>
      <path d="M12 3.5 4.5 6.5v5c0 4.8 3.2 8.3 7.5 9 4.3-.7 7.5-4.2 7.5-9v-5z" />
      <path d="m9 12 2 2 4-4.2" />
    </>
  ),
  logout: (
    <>
      <path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
      <path d="M17 8.5 20.5 12 17 15.5M20 12H9.5" />
    </>
  ),
}

export default function Icon({ name, size = 20, className, ...rest }) {
  const path = paths[name]
  if (!path) return null

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {path}
    </svg>
  )
}
