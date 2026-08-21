import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import Icon from './Icon'
import Modal from './Modal'
import { useAuth } from '../utils/authContext'
import { resolveDisplayName } from '../services/userService'
import { useToast } from '../utils/toastContext'
import '../styles/user-menu.css'

const ROLE_LABEL = {
  admin: 'Quản trị viên',
  user: 'Thành viên',
}

/** Avatar ở header + menu thả xuống — dùng dữ liệu tài khoản Firebase thật. */
export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()
  const toast = useToast()
  const { user, role, roleLoading, isAdmin, logout } = useAuth()
  // Chỉ coi là admin khi role đã xác nhận XONG — cùng lý do như Sidebar.jsx.
  const confirmedAdmin = isAdmin && !roleLoading

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const goTo = (path) => {
    setOpen(false)
    navigate(path)
  }

  // Tên hiển thị: ưu tiên displayName Firebase, fallback phần trước "@" của
  // email — không bao giờ dùng dữ liệu giả cố định.
  const name = user ? resolveDisplayName(user) : ''
  const roleLabel = roleLoading ? 'Đang tải…' : ROLE_LABEL[role] ?? ROLE_LABEL.user

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      setConfirmLogout(false)
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error('Không thể đăng xuất', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setLoggingOut(false)
    }
  }

  if (!user) return null

  return (
    <div className="user-menu" ref={wrapperRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name} photoURL={user.photoURL} />
        <span className="user-menu-identity">
          <span className="user-menu-name">{name}</span>
          <span className="user-menu-role">{roleLabel}</span>
        </span>
        <Icon name="chevronLeft" size={16} className="user-menu-caret" />
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-head">
            <Avatar name={name} photoURL={user.photoURL} size="lg" />
            <div>
              <p className="user-menu-name">{name}</p>
              <p className="user-menu-email">{user.email}</p>
            </div>
          </div>

          <hr />

          {confirmedAdmin && (
            <button
              type="button"
              className="user-menu-item"
              role="menuitem"
              onClick={() => goTo('/quan-tri/nguoi-dung')}
            >
              <Icon name="shield" size={17} />
              Quản lý người dùng
            </button>
          )}

          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => goTo('/profile')}
          >
            <Icon name="employees" size={17} />
            Hồ sơ cá nhân
          </button>

          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => goTo('/cai-dat')}
          >
            <Icon name="settings" size={17} />
            Cài đặt tài khoản
          </button>

          <hr />

          <button
            type="button"
            className="user-menu-item user-menu-item-danger"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setConfirmLogout(true)
            }}
          >
            <Icon name="logout" size={17} />
            Đăng xuất
          </button>
        </div>
      )}

      <Modal
        open={confirmLogout}
        onClose={() => !loggingOut && setConfirmLogout(false)}
        title="Đăng xuất khỏi AQUA?"
        description="Bạn sẽ cần đăng nhập lại để tiếp tục làm việc."
        size="sm"
        closeOnOverlay={!loggingOut}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmLogout(false)}
              disabled={loggingOut}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut && <span className="auth-spinner" aria-hidden="true" />}
              {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          </>
        }
      >
        <p>Bạn sẽ cần đăng nhập lại bằng email và mật khẩu để tiếp tục sử dụng AQUA.</p>
      </Modal>
    </div>
  )
}
