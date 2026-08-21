import Icon from '../Icon'
import { getChecklistProgress } from '../../utils/taskUtils'
import cx from '../../utils/cx'

/** Danh sách checklist với tick/bỏ tick — tiến độ tự tính theo trạng thái dòng. */
export default function TaskChecklist({ items, onToggle, readOnly = false }) {
  const progress = getChecklistProgress(items)

  return (
    <div className="task-checklist">
      <header className="task-checklist-header">
        <h3 className="task-checklist-title">Checklist</h3>
        <span className="task-checklist-count">
          {progress.total === 0
            ? 'Chưa có mục nào'
            : `${progress.completed}/${progress.total} hoàn thành · ${progress.percent}%`}
        </span>
      </header>

      {progress.total > 0 && (
        <div className="task-progress-track" aria-hidden="true">
          <span className="task-progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
      )}

      <ul className="task-checklist-list">
        {items.map((item) => (
          <li key={item.id}>
            <label className={cx('task-checklist-item', item.completed && 'task-checklist-item-done')}>
              <input
                type="checkbox"
                className="task-checklist-input"
                checked={item.completed}
                disabled={readOnly}
                onChange={() => onToggle(item)}
              />
              <span className="task-checklist-box" aria-hidden="true">
                <Icon name="check" size={13} />
              </span>
              <span className="task-checklist-text">{item.title}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
