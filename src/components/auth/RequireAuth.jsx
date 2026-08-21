import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../utils/authContext'

/**
 * Chặn truy cập toàn bộ khu vực ứng dụng khi chưa đăng nhập.
 * Chưa xác định xong trạng thái ban đầu (`loading`) → không render gì,
 * tránh flash sang /login rồi lại quay về khi F5.
 */
export default function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
