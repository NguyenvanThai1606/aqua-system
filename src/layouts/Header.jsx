import { useNavigate, useLocation } from 'react-router-dom'
import Icon from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import UserMenu from '../components/UserMenu'
import HeaderSearch from '../components/HeaderSearch'
import { flatNavigation, standalonePages } from '../data/navigation'
import { useNotifications } from '../utils/notificationsContext'
import '../styles/header.css'

function useCurrentPageTitle() {
  const { pathname } = useLocation()

  // Tra trong các trang ngoài sidebar TRƯỚC (ví dụ `/profile`), rồi mới tới
  // menu chính — nếu chỉ tra `flatNavigation` thì những trang này luôn rơi vào
  // nhãn "Không tìm thấy trang" dù route hoạt động bình thường.
  const match = [...standalonePages, ...flatNavigation].find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  )

  return match?.label ?? 'Không tìm thấy trang'
}

export default function Header({ onToggleSidebar }) {
  const title = useCurrentPageTitle()
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()

  return (
    <header className="header">
      <div className="header-left">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleSidebar}
          aria-label="Đóng/mở thanh điều hướng"
        >
          <Icon name="menu" size={20} />
        </button>

        <h2 className="header-title">{title}</h2>
      </div>

      <HeaderSearch />

      <div className="header-right">
        <button
          type="button"
          className="icon-btn header-bell"
          onClick={() => navigate('/thong-bao')}
          aria-label={unreadCount > 0 ? `Thông báo — ${unreadCount} chưa đọc` : 'Thông báo'}
        >
          <Icon name="bell" size={19} />
          {unreadCount > 0 && (
            <span className="header-bell-dot" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <ThemeToggle />

        <span className="header-divider" aria-hidden="true" />

        <UserMenu />
      </div>
    </header>
  )
}
