import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../utils/authContext'

/**
 * Chặn truy cập các route quản trị nếu người dùng không có role 'admin'.
 * Chỉ dùng BÊN TRONG `<RequireAuth>` (đã đảm bảo có `user`).
 *
 * Đây là lớp bảo vệ ở tầng UI/routing — lớp bảo vệ thật sự nằm ở Firestore
 * Security Rules (xem `firestore.rules`), vì một request API/console vẫn có
 * thể bỏ qua route này.
 *
 * Trong lúc `roleLoading` (đang chờ Firestore trả role) → không render gì,
 * tránh việc một admin thật bị đá về Dashboard chỉ vì role chưa kịp tải.
 */
export default function RequireAdmin() {
  const { isAdmin, roleLoading } = useAuth()

  if (roleLoading) return null

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
