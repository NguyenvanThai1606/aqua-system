import Logo from '../Logo'
import '../../styles/auth.css'

/**
 * Khung chung cho trang Đăng nhập / Đăng ký: panel thương hiệu bên trái
 * (ẩn trên màn hẹp) + panel form bên phải. Tái dùng bảng màu sidebar và
 * `.card`-style shadow/radius đã có sẵn của AQUA.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <Logo />

          <div className="auth-brand-copy">
            <p className="auth-brand-title">
              Quản lý công việc, dự án và đội nhóm trong một nơi duy nhất.
            </p>
            <p className="auth-brand-text">
              Đăng nhập để tiếp tục theo dõi dự án, công việc và hiệu suất đội
              nhóm của bạn trên AQUA.
            </p>
          </div>

          <p className="auth-brand-foot">© {new Date().getFullYear()} AQUA</p>
        </div>

        <div className="auth-panel">{children}</div>
      </div>
    </div>
  )
}
