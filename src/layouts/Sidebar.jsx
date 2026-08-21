import { NavLink } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import navigation from '../data/navigation'
import { useTasks } from '../utils/tasksContext'
import { useProjects } from '../utils/projectsContext'
import { useMessages } from '../utils/messagesContext'
import { useNotifications } from '../utils/notificationsContext'
import { useAuth } from '../utils/authContext'
import cx from '../utils/cx'
import '../styles/sidebar.css'

/**
 * Sidebar điều hướng.
 * - Desktop: thu gọn thành thanh icon (collapsed).
 * - Tablet/mobile: trượt ra như ngăn kéo (open).
 *
 * Mục có `adminOnly: true` chỉ hiển thị khi role hiện tại là 'admin'.
 * Đây CHỈ là ẩn nút ở UI — quyền truy cập thật sự vẫn được chặn ở route
 * (`RequireAdmin`) và Firestore Security Rules, để user không thể "mở khóa"
 * mục quản trị chỉ bằng cách sửa DOM/state ở trình duyệt.
 */
export default function Sidebar({ collapsed, open, onNavigate }) {
  const { overdueCount: overdueTasks } = useTasks()
  const { overdueCount: overdueProjects } = useProjects()
  const { unreadTotal: unreadMessages } = useMessages()
  const { unreadCount: unreadNotifications } = useNotifications()
  const { isAdmin, roleLoading } = useAuth()
  // Chỉ coi là admin khi role đã xác nhận XONG (!roleLoading) — tránh mọi
  // khả năng hiển thị nhầm mục quản trị bằng giá trị role cũ còn sót lại
  // trong khoảnh khắc chuyển đổi user (xem AuthProvider.jsx).
  const confirmedAdmin = isAdmin && !roleLoading

  // Số đếm động theo `badgeKey` khai báo trong navigation.
  const dynamicBadges = { overdueTasks, overdueProjects, unreadMessages, unreadNotifications }

  const badgeAlertTitles = {
    overdueTasks: 'công việc quá hạn',
    overdueProjects: 'dự án quá hạn',
    unreadMessages: 'tin nhắn chưa đọc',
    unreadNotifications: 'thông báo chưa đọc',
  }

  const visibleGroups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || confirmedAdmin),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <aside className={cx('sidebar', collapsed && 'sidebar-collapsed', open && 'sidebar-open')}>
      <div className="sidebar-brand">
        <Logo compact={collapsed} />
      </div>

      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {visibleGroups.map((group) => (
          <div key={group.section} className="sidebar-group">
            <p className="sidebar-section">{group.section}</p>

            <ul>
              {group.items.map((item) => {
                const badge = item.badgeKey ? dynamicBadges[item.badgeKey] : item.badge
                const isAlert = Boolean(item.badgeKey)

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cx('sidebar-link', isActive && 'sidebar-link-active')
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon name={item.icon} size={19} className="sidebar-link-icon" />
                      <span className="sidebar-link-label">{item.label}</span>
                      {Boolean(badge) && (
                        <span
                          className={cx('sidebar-badge', isAlert && 'sidebar-badge-alert')}
                          title={
                            isAlert
                              ? `${badge} ${badgeAlertTitles[item.badgeKey] ?? 'mục quá hạn'}`
                              : undefined
                          }
                        >
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-version">AQUA · Phiên bản 0.1</p>
      </div>
    </aside>
  )
}
