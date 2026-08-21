import { Link, useLocation } from 'react-router-dom'
import Icon from '../components/Icon'
import '../styles/not-found.css'

export default function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <div className="not-found">
      <p className="not-found-code">404</p>
      <h1 className="not-found-title">Không tìm thấy trang</h1>
      <p className="not-found-text">
        Đường dẫn <code>{pathname}</code> không tồn tại hoặc đã được đổi tên.
      </p>

      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">
          <Icon name="dashboard" size={17} />
          Về Dashboard
        </Link>
        <Link to="/cong-viec" className="btn btn-secondary">
          <Icon name="tasks" size={17} />
          Xem công việc
        </Link>
      </div>
    </div>
  )
}
