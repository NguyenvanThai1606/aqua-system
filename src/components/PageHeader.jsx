import Icon from './Icon'
import '../styles/page-header.css'

/** Tiêu đề trang + mô tả + vùng nút hành động. */
export default function PageHeader({ icon, title, description, actions }) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {icon && (
          <span className="page-header-icon">
            <Icon name={icon} size={22} />
          </span>
        )}
        <div>
          <h1 className="page-header-title">{title}</h1>
          {description && <p className="page-header-description">{description}</p>}
        </div>
      </div>

      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}
