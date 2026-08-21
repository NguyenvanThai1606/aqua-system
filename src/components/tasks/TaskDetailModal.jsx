import Modal from '../Modal'
import Avatar from '../Avatar'
import Icon from '../Icon'
import TaskChecklist from './TaskChecklist'
import { TASK_PRIORITIES, TASK_STATUSES, getPriorityMeta } from '../../data/taskMeta'
import {
  daysUntilDeadline,
  formatDeadline,
  isOverdue,
} from '../../utils/taskUtils'
import useUserProfiles from '../../utils/useUserProfiles'
import { isLegacyPerson, toPersonRef } from '../../services/userService'

/** Mô tả trạng thái deadline bằng lời — rõ hơn là chỉ hiện ngày. */
function deadlineHint(task) {
  const days = daysUntilDeadline(task)
  if (days === null) return null
  if (isOverdue(task)) return `Quá hạn ${Math.abs(days)} ngày`
  if (days === 0) return 'Đến hạn hôm nay'
  if (days === 1) return 'Còn 1 ngày'
  return `Còn ${days} ngày`
}

/**
 * Chi tiết công việc: xem thông tin, đổi trạng thái/ưu tiên,
 * tick checklist và mở luồng xóa.
 */
export default function TaskDetailModal({
  task,
  open,
  onClose,
  onPatch,
  onToggleChecklistItem,
  onRequestDelete,
  canDelete = false,
  canReassign = false,
}) {
  const { profiles: users, loading: usersLoading } = useUserProfiles(open && canReassign)

  if (!task) return null

  const priority = getPriorityMeta(task.priority)
  const overdue = isOverdue(task)
  const hint = deadlineHint(task)

  const handleAssigneeChange = (assigneeId) => {
    onPatch({ assignee: assigneeId ? toPersonRef(users.find((p) => p.id === assigneeId)) : null })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={task.title}
      description={`Tạo ngày ${new Date(task.createdAt).toLocaleDateString('vi-VN')}`}
      footer={
        <>
          {canDelete && (
            <button
              type="button"
              className="btn btn-danger-ghost task-detail-delete"
              onClick={onRequestDelete}
            >
              <Icon name="error" size={16} />
              Xóa công việc
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      <div className="task-detail">
        {overdue && (
          <p className="task-detail-alert">
            <Icon name="warning" size={16} />
            Công việc đã quá hạn {hint ? `— ${hint.toLowerCase()}` : ''}
          </p>
        )}

        <section className="task-detail-section">
          <h3 className="task-detail-label">Mô tả</h3>
          <p className="task-detail-text">
            {task.description || <span className="muted">Chưa có mô tả.</span>}
          </p>
        </section>

        <dl className="task-detail-meta">
          <div className="task-detail-meta-item">
            <dt>Người phụ trách</dt>
            <dd>
              {task.assignee ? (
                <span className="task-detail-person">
                  <Avatar
                    name={task.assignee.name}
                    initials={task.assignee.initials}
                    photoURL={task.assignee.photoURL}
                    size="sm"
                  />
                  {task.assignee.name}
                  {isLegacyPerson(task.assignee) && <span className="muted"> (dữ liệu cũ)</span>}
                </span>
              ) : (
                <span className="muted">Chưa phân công</span>
              )}
            </dd>
          </div>

          <div className="task-detail-meta-item">
            <dt>Deadline</dt>
            <dd>
              <span className={overdue ? 'task-detail-deadline-overdue' : undefined}>
                {formatDeadline(task.deadline)}
              </span>
              {hint && <span className="task-detail-hint">{hint}</span>}
            </dd>
          </div>

          <div className="task-detail-meta-item">
            <dt>Mức ưu tiên hiện tại</dt>
            <dd>
              <span className={`badge badge-${priority.tone}`}>{priority.label}</span>
            </dd>
          </div>
        </dl>

        <div className="task-detail-controls">
          <div className="field">
            <label className="field-label" htmlFor="detail-status">
              Trạng thái
            </label>
            <select
              id="detail-status"
              className="select"
              value={task.status}
              onChange={(event) => onPatch({ status: event.target.value })}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="detail-priority">
              Mức ưu tiên
            </label>
            <select
              id="detail-priority"
              className="select"
              value={task.priority}
              onChange={(event) => onPatch({ priority: event.target.value })}
            >
              {TASK_PRIORITIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {canReassign && (
            <div className="field">
              <label className="field-label" htmlFor="detail-task-assignee">
                Người phụ trách
              </label>
              <select
                id="detail-task-assignee"
                className="select"
                value={isLegacyPerson(task.assignee) ? '' : (task.assignee?.id ?? '')}
                onChange={(event) => handleAssigneeChange(event.target.value)}
                disabled={usersLoading}
              >
                <option value="">Chưa phân công</option>
                {users.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName || profile.email}
                    {profile.email ? ` (${profile.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <TaskChecklist
          items={task.checklist}
          onToggle={(item) => onToggleChecklistItem(item.id)}
        />
      </div>
    </Modal>
  )
}
