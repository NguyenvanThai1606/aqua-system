import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Icon from '../components/Icon'
import { useNotifications } from '../utils/notificationsContext'
import {
  formatRelativeTime,
  getNotificationIcon,
  getNotificationTypeLabel,
  getNotificationLinkPath,
} from '../utils/notificationUtils'
import cx from '../utils/cx'
import '../styles/notifications.css'

export default function NotificationsPage() {
  const { notifications, loading, error, unreadCount, markRead, markAllRead, removeNotification } =
    useNotifications()
  const navigate = useNavigate()

  const handleOpen = (notification) => {
    if (!notification.read) {
      markRead(notification.id).catch((err) =>
        console.error('[NotificationsPage] Không đánh dấu đã đọc được:', err),
      )
    }

    const path = getNotificationLinkPath(notification)
    if (path) navigate(path)
  }

  const handleDelete = (event, id) => {
    event.stopPropagation()
    removeNotification(id).catch((err) => console.error('[NotificationsPage] Không xóa được thông báo:', err))
  }

  const handleMarkAllRead = () => {
    markAllRead().catch((err) => console.error('[NotificationsPage] Không đánh dấu tất cả đã đọc được:', err))
  }

  return (
    <>
      <PageHeader
        icon="bell"
        title="Thông báo"
        description="Mọi thông báo về công việc, dự án, và tin nhắn nhóm liên quan tới bạn."
        actions={
          unreadCount > 0 && (
            <button type="button" className="btn btn-secondary" onClick={handleMarkAllRead}>
              <Icon name="check" size={15} />
              Đánh dấu tất cả đã đọc
            </button>
          )
        }
      />

      <Card padded={false}>
        {loading && <p className="notification-state muted">Đang tải thông báo…</p>}

        {!loading && error && (
          <p className="notification-state notification-state-error">
            <Icon name="error" size={16} />
            Không tải được thông báo. Kiểm tra kết nối mạng rồi thử tải lại trang.
          </p>
        )}

        {!loading && !error && notifications.length === 0 && (
          <p className="notification-state muted">Chưa có thông báo nào.</p>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="notification-list">
            {notifications.map((notification) => {
              const clickable = Boolean(getNotificationLinkPath(notification))
              return (
                <li
                  key={notification.id}
                  className={cx(
                    'notification-item',
                    !notification.read && 'notification-item-unread',
                    clickable && 'notification-item-clickable',
                  )}
                  onClick={() => handleOpen(notification)}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (clickable && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      handleOpen(notification)
                    }
                  }}
                >
                  <span className="notification-item-icon" aria-hidden="true">
                    <Icon name={getNotificationIcon(notification)} size={17} />
                  </span>

                  <span className="notification-item-body">
                    <span className="notification-item-row">
                      <span className="notification-item-type muted">{getNotificationTypeLabel(notification)}</span>
                      <span className="notification-item-time muted">{formatRelativeTime(notification.createdAt)}</span>
                    </span>
                    <span className="notification-item-title">{notification.title}</span>
                    {notification.message && (
                      <span className="notification-item-message muted">{notification.message}</span>
                    )}
                  </span>

                  {!notification.read && <span className="notification-item-dot" aria-hidden="true" />}

                  <button
                    type="button"
                    className="icon-btn notification-item-delete"
                    onClick={(event) => handleDelete(event, notification.id)}
                    aria-label="Xóa thông báo"
                    title="Xóa thông báo"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
