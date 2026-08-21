import '../styles/logo.css'

/** Logo AQUA: dấu giọt nước + chữ. */
export default function Logo({ compact = false }) {
  return (
    <span className="logo">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2.8c3.6 4 6.2 7.2 6.2 10.5A6.2 6.2 0 0 1 5.8 13.3C5.8 10 8.4 6.8 12 2.8"
            fill="currentColor"
            opacity=".92"
          />
          <path
            d="M9.2 13.6a2.8 2.8 0 0 0 3.4 2.8"
            stroke="#0a1120"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".55"
          />
        </svg>
      </span>

      {!compact && (
        <span className="logo-text">
          <span className="logo-name">AQUA</span>
          <span className="logo-tagline">Quản lý doanh nghiệp</span>
        </span>
      )}
    </span>
  )
}
