import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../utils/authContext'

export default function RequirePermission({ permission }) {
  const { hasPermission, roleLoading } = useAuth()

  if (roleLoading) return null
  if (!hasPermission(permission)) return <Navigate to="/" replace />
  return <Outlet />
}