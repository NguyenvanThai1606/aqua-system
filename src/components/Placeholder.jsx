import Icon from './Icon'
import '../styles/placeholder.css'

/**
 * Khối giữ chỗ cho các tính năng sẽ làm ở giai đoạn sau.
 * `features` là danh sách gạch đầu dòng mô tả nội dung dự kiến.
 */
export default function Placeholder({ icon = 'ai', title, description, features = [] }) {
  return (
    <div className="placeholder">
      <span className="placeholder-icon">
        <Icon name={icon} size={26} />
      </span>

      <h2 className="placeholder-title">{title}</h2>
      {description && <p className="placeholder-description">{description}</p>}

      {features.length > 0 && (
        <ul className="placeholder-list">
          {features.map((feature) => (
            <li key={feature} className="placeholder-item">
              <Icon name="check" size={15} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="placeholder-note">Nội dung sẽ được hoàn thiện ở giai đoạn sau.</p>
    </div>
  )
}
