import cx from '../utils/cx'
import '../styles/card.css'

/** Khối nội dung nền trắng dùng lại ở mọi trang. */
export default function Card({ title, action, children, className, padded = true }) {
  return (
    <section className={cx('card', className)}>
      {(title || action) && (
        <header className="card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cx('card-body', !padded && 'card-body-flush')}>{children}</div>
    </section>
  )
}
