import Modal from '../Modal'
import Avatar from '../Avatar'
import Icon from '../Icon'
import { PROJECT_STATUSES, getProjectStatusMeta } from '../../data/projectMeta'
import {
  daysUntilDeadline,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  getBudgetUsage,
  getDistinctCustomers,
  isProjectOverdue,
  toCustomerRef,
} from '../../utils/projectUtils'
import useUserProfiles from '../../utils/useUserProfiles'
import { useProjects } from '../../utils/projectsContext'
import { isLegacyPerson, toPersonRef } from '../../services/userService'
import cx from '../../utils/cx'

/** Mô tả trạng thái deadline bằng lời — rõ hơn là chỉ hiện ngày. */
function deadlineHint(project) {
  const days = daysUntilDeadline(project)
  if (days === null) return null
  if (isProjectOverdue(project)) return `Quá hạn ${Math.abs(days)} ngày`
  if (days === 0) return 'Đến hạn hôm nay'
  if (days === 1) return 'Còn 1 ngày'
  return `Còn ${days} ngày`
}

/**
 * Chi tiết dự án: xem thông tin, chỉnh sửa trạng thái/tiến độ/ngân sách
 * và mở luồng xóa.
 */
export default function ProjectDetailModal({
  project,
  open,
  onClose,
  onPatch,
  onRequestDelete,
  canEdit = false,
}) {
  const { profiles: users, loading: usersLoading } = useUserProfiles(open && canEdit)
  const { projects } = useProjects()
  const existingCustomers = getDistinctCustomers(projects)

  if (!project) return null

  const status = getProjectStatusMeta(project.status)
  const overdue = isProjectOverdue(project)
  const hint = deadlineHint(project)
  const budget = getBudgetUsage(project)
  const taskProgress = project.taskProgress ?? { total: 0, completed: 0, percent: 0 }

  const handleManagerChange = (managerId) => {
    onPatch({ manager: managerId ? toPersonRef(users.find((p) => p.id === managerId)) : null })
  }

  const handleCustomerChange = (name) => {
    onPatch({ customer: toCustomerRef(name) })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={project.name}
      description={`Tạo ngày ${new Date(project.createdAt).toLocaleDateString('vi-VN')}`}
      footer={
        <>
          {canEdit && (
            <button
              type="button"
              className="btn btn-danger-ghost project-detail-delete"
              onClick={onRequestDelete}
            >
              <Icon name="error" size={16} />
              Xóa dự án
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      <div className="project-detail">
        {overdue && (
          <p className="project-detail-alert">
            <Icon name="warning" size={16} />
            Dự án đã quá hạn {hint ? `— ${hint.toLowerCase()}` : ''}
          </p>
        )}

        {budget.over && (
          <p className="project-detail-alert">
            <Icon name="warning" size={16} />
            Chi phí đã vượt ngân sách ({formatCompactCurrency(project.spent)} /{' '}
            {formatCompactCurrency(project.budget)})
          </p>
        )}

        <section className="project-detail-section">
          <h3 className="project-detail-label">Mô tả</h3>
          <p className="project-detail-text">
            {project.description || <span className="muted">Chưa có mô tả.</span>}
          </p>
        </section>

        <dl className="project-detail-meta">
          <div className="project-detail-meta-item">
            <dt>Trạng thái hiện tại</dt>
            <dd>
              <span className={`badge badge-${status.tone}`}>{status.label}</span>
            </dd>
          </div>

          <div className="project-detail-meta-item">
            <dt>Khách hàng</dt>
            <dd>
              {project.customer ? (
                project.customer.name
              ) : (
                <span className="muted">Chưa có khách hàng</span>
              )}
            </dd>
          </div>

          <div className="project-detail-meta-item">
            <dt>Người phụ trách</dt>
            <dd>
              {project.manager ? (
                <span className="project-detail-person">
                  <Avatar
                    name={project.manager.name}
                    initials={project.manager.initials}
                    photoURL={project.manager.photoURL}
                    size="sm"
                  />
                  {project.manager.name}
                  {isLegacyPerson(project.manager) && (
                    <span className="muted"> (dữ liệu cũ)</span>
                  )}
                </span>
              ) : (
                <span className="muted">Chưa phân công</span>
              )}
            </dd>
          </div>

          <div className="project-detail-meta-item">
            <dt>Ngày bắt đầu</dt>
            <dd>{formatDate(project.startDate)}</dd>
          </div>

          <div className="project-detail-meta-item">
            <dt>Deadline</dt>
            <dd>
              <span className={overdue ? 'project-detail-deadline-overdue' : undefined}>
                {formatDate(project.deadline)}
              </span>
              {hint && <span className="project-detail-hint">{hint}</span>}
            </dd>
          </div>

          <div className="project-detail-meta-item">
            <dt>Ngân sách</dt>
            <dd>{formatCurrency(project.budget)}</dd>
          </div>

          <div className="project-detail-meta-item">
            <dt>Đã chi</dt>
            <dd className={cx(budget.over && 'project-budget-over')}>
              {formatCurrency(project.spent)}
            </dd>
          </div>
        </dl>

        <div className="project-detail-budget-bar">
          <div className="project-detail-budget-head">
            <span>Tiến độ công việc</span>
            <span>{taskProgress.percent}%</span>
          </div>
          <div className="project-progress-track" aria-hidden="true">
            <span
              className="project-progress-fill"
              style={{ width: `${taskProgress.percent}%` }}
            />
          </div>
          <p className="project-detail-hint">
            {taskProgress.completed}/{taskProgress.total} task hoàn thành
          </p>
        </div>

        <div className="project-detail-budget-bar">
          <div className="project-detail-budget-head">
            <span>Sử dụng ngân sách</span>
            <span className={cx(budget.over && 'project-budget-over')}>{budget.percent}%</span>
          </div>
          <div className="project-progress-track" aria-hidden="true">
            <span
              className="project-progress-fill"
              style={{ width: `${Math.min(budget.percent, 100)}%` }}
            />
          </div>
        </div>

        {canEdit && (
          <div className="project-detail-controls">
            <div className="field">
              <label className="field-label" htmlFor="detail-project-status">
                Trạng thái
              </label>
              <select
                id="detail-project-status"
                className="select"
                value={project.status}
                onChange={(event) => onPatch({ status: event.target.value })}
              >
                {PROJECT_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="detail-project-budget">
                Ngân sách (VNĐ)
              </label>
              <input
                id="detail-project-budget"
                type="number"
                min="0"
                step="1000000"
                className="input"
                value={project.budget}
                onChange={(event) => onPatch({ budget: event.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="detail-project-spent">
                Đã chi (VNĐ)
              </label>
              <input
                id="detail-project-spent"
                type="number"
                min="0"
                step="1000000"
                className="input"
                value={project.spent}
                onChange={(event) => onPatch({ spent: event.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="detail-project-customer">
                Khách hàng
              </label>
              {/* `onBlur` thay vì `onChange` như các field khác trong modal
                  này — trường tự do (không phải `<select>`) nên gõ từng
                  ký tự sẽ gọi `onPatch()` (ghi Firestore) liên tục nếu dùng
                  `onChange`; chỉ ghi khi rời khỏi ô, sau khi gõ xong tên. */}
              <input
                id="detail-project-customer"
                type="text"
                className="input"
                list="detail-project-customer-options"
                defaultValue={project.customer?.name ?? ''}
                onBlur={(event) => handleCustomerChange(event.target.value)}
                placeholder="Tên khách hàng bất kỳ — có thể tự nhập"
                maxLength={200}
              />
              <datalist id="detail-project-customer-options">
                {existingCustomers.map((customer) => (
                  <option key={customer.id} value={customer.name} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="detail-project-manager">
                Người phụ trách
              </label>
              <select
                id="detail-project-manager"
                className="select"
                value={isLegacyPerson(project.manager) ? '' : (project.manager?.id ?? '')}
                onChange={(event) => handleManagerChange(event.target.value)}
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

            <div className="field">
              <label className="field-label" htmlFor="detail-project-start">
                Ngày bắt đầu
              </label>
              <input
                id="detail-project-start"
                type="date"
                className="input"
                value={project.startDate ?? ''}
                onChange={(event) => onPatch({ startDate: event.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="detail-project-deadline">
                Deadline
              </label>
              <input
                id="detail-project-deadline"
                type="date"
                className="input"
                value={project.deadline ?? ''}
                onChange={(event) => onPatch({ deadline: event.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
