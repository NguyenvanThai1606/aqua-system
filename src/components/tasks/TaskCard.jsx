import Avatar from '../Avatar'
import Icon from '../Icon'
import { getPriorityMeta, getStatusMeta } from '../../data/taskMeta'
import {
  formatDeadline,
  getChecklistProgress,
  isOverdue,
} from '../../utils/taskUtils'
import cx from '../../utils/cx'

/** Một thẻ công việc trên bảng Kanban. Bấm vào để mở chi tiết. */
export default function TaskCard({ task, onOpen }) {
  const status = getStatusMeta(task.status)
  const priority = getPriorityMeta(task.priority)
  const progress = getChecklistProgress(task.checklist)
  const overdue = isOverdue(task)

  return (
    <article className={cx('task-card', overdue && 'task-card-overdue')}>
      <button
        type="button"
        className="task-card-hit"
        onClick={() => onOpen(task)}
        aria-label={`Mở chi tiết công việc ${task.title}`}
      />

      <div className="task-card-badges">
        <span className={`badge badge-${status.tone}`}>{status.label}</span>
        <span className={`badge badge-${priority.tone}`}>{priority.label}</span>
        {overdue && (
          <span className="badge badge-danger task-card-overdue-badge">
            <Icon name="warning" size={13} />
            Quá hạn
          </span>
        )}
      </div>

      <h3 className="task-card-title">{task.title}</h3>
      {task.description && <p className="task-card-description">{task.description}</p>}

      {progress.total > 0 && (
        <div className="task-card-progress">
          <div className="task-progress-track" aria-hidden="true">
            <span className="task-progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="task-progress-text">
            {progress.completed}/{progress.total} · {progress.percent}%
          </span>
        </div>
      )}

      <footer className="task-card-footer">
        <span className="task-card-assignee">
          {task.assignee ? (
            <>
              <Avatar
                name={task.assignee.name}
                initials={task.assignee.initials}
                photoURL={task.assignee.photoURL}
                size="sm"
              />
              <span className="task-card-assignee-name">{task.assignee.name}</span>
            </>
          ) : (
            <span className="task-card-assignee-name muted">Chưa phân công</span>
          )}
        </span>

        <span className={cx('task-card-deadline', overdue && 'task-card-deadline-overdue')}>
          <Icon name="calendar" size={14} />
          {formatDeadline(task.deadline)}
        </span>
      </footer>
    </article>
  )
}
