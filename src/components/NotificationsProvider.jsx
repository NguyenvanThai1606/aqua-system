import { useCallback, useEffect, useMemo, useState } from 'react'
import { NotificationsContext } from '../utils/notificationsContext'
import { useAuth } from '../utils/authContext'
import * as notificationService from '../services/notificationService'

/**
 * Kho thông báo dùng chung cho trang /thong-bao VÀ badge số chưa đọc ở
 * Header + Sidebar (`badgeKey: 'unreadNotifications'`, xem
 * `layouts/Sidebar.jsx`/`layouts/Header.jsx`) — cùng lý do
 * MessagesProvider/EventsProvider được đặt ở App.jsx thay vì local state
 * riêng của một trang: badge cần thấy số chưa đọc ở MỌI trang.
 *
 * Đặt Ở TRÊN `TasksProvider`/`ProjectsProvider`/`MessagesProvider` trong
 * cây provider (xem `App.jsx`) vì ba provider đó gọi `useNotifications()`
 * để tự phát sinh thông báo khi giao việc/chỉ định quản lý dự án/thêm
 * thành viên nhóm — `notify()` ở dưới đây phải sẵn sàng TRƯỚC khi các
 * provider đó render.
 */
export default function NotificationsProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) {
      setNotifications([])
      setLoading(true)
      setError(null)
      return undefined
    }

    if (!user) {
      setNotifications([])
      setLoading(false)
      setError(null)
      return undefined
    }

    setLoading(true)
    setError(null)
    const unsubscribe = notificationService.subscribeNotifications(
      user.uid,
      (list) => {
        setNotifications(list)
        setLoading(false)
      },
      (subscribeError) => {
        setError(subscribeError)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [authLoading, user])

  /**
   * Tạo thông báo cho MỘT người nhận. Được gọi bởi
   * `TasksProvider`/`ProjectsProvider`/`MessagesProvider` khi có hành động
   * sinh ra thông báo — KHÔNG throw ra ngoài nếu tạo thất bại (vd. do
   * quyền, do mất mạng), vì việc giao task/thêm member đã thành công rồi,
   * không nên làm hỏng thao tác chính chỉ vì gửi thông báo phụ trợ bị lỗi.
   * Nơi gọi `notify()` tự `.catch()` và `console.error` — xem các provider
   * trên.
   */
  const notify = useCallback((payload) => {
    return notificationService.createNotification(payload)
  }, [])

  const notifyMany = useCallback((payloads) => {
    return notificationService.createNotifications(payloads)
  }, [])

  const markRead = useCallback(
    (id) => {
      if (!user) return Promise.resolve()
      return notificationService.markNotificationRead(id)
    },
    [user],
  )

  const markAllRead = useCallback(() => {
    if (!user) return Promise.resolve()
    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id)
    return notificationService.markAllNotificationsRead(unreadIds)
  }, [user, notifications])

  const removeNotification = useCallback(
    (id) => {
      if (!user) return Promise.resolve()
      return notificationService.deleteNotification(id)
    },
    [user],
  )

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  const value = useMemo(
    () => ({
      notifications,
      loading,
      error,
      unreadCount,
      notify,
      notifyMany,
      markRead,
      markAllRead,
      removeNotification,
    }),
    [notifications, loading, error, unreadCount, notify, notifyMany, markRead, markAllRead, removeNotification],
  )

  return <NotificationsContext value={value}>{children}</NotificationsContext>
}
