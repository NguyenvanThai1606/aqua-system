import Avatar from '../Avatar'
import Icon from '../Icon'
import { getProjectStatusMeta } from '../../data/projectMeta'
import {
  formatCompactCurrency,
  formatDate,
  getBudgetUsage,
  isProjectOverdue,
} from '../../utils/projectUtils'
import cx from '../../utils/cx'

/** Một thẻ dự án trong danh sách. Bấm vào để mở chi tiết. */
export default function ProjectCard({ project, onOpen }) {
  const status = getProjectStatusMeta(project.status)
  const budget = getBudgetUsage(project)
  const overdue = isProjectOverdue(project)

  return (
    <article className={cx('project-card', overdue && 'project-card-overdue')}>
      <button
        type="button"
        className="project-card-hit"
        onClick={() => onOpen(project)}
        aria-label={`Mở chi tiết dự án ${project.name}`}
      />

      <div className="project-card-badges">
        <span className={`badge badge-${status.tone}`}>{status.label}</span>
        {overdue && (
          <span className="badge badge-danger project-card-overdue-badge">
            <Icon name="warning" size={13} />
            Quá hạn
          </span>
        )}
        {budget.over && (
          <span className="badge badge-warning project-card-overdue-badge">Vượt ngân sách</span>
        )}
      </div>

      <h3 className="project-card-title">{project.name}</h3>

      <p className="project-card-customer">
        <Icon name="projects" size={14} />
        {project.customer?.name ?? <span className="muted">Chưa có khách hàng</span>}
      </p>

      <div className="project-card-progress">
        <div className="project-progress-head">
          <span className="project-progress-label">Tiến độ</span>
          <span className="project-progress-value">{project.progress}%</span>
        </div>
        <div className="project-progress-track" aria-hidden="true">
          <span className="project-progress-fill" style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <dl className="project-card-budget">
        <div>
          <dt>Ngân sách</dt>
          <dd>{formatCompactCurrency(project.budget)}</dd>
        </div>
        <div>
          <dt>Đã dùng</dt>
          <dd
            className={cx(
              budget.over && 'project-budget-over',
              budget.warning && 'project-budget-warning',
            )}
          >
            {formatCompactCurrency(project.spent)}
            <span className="project-budget-percent">{budget.percent}%</span>
          </dd>
        </div>
      </dl>

      <footer className="project-card-footer">
        <span className="project-card-manager">
          {project.manager ? (
            <>
              <Avatar
                name={project.manager.name}
                initials={project.manager.initials}
                photoURL={project.manager.photoURL}
                size="sm"
              />
              <span className="project-card-manager-name">{project.manager.name}</span>
            </>
          ) : (
            <span className="project-card-manager-name muted">Chưa có người phụ trách</span>
          )}
        </span>

        <span className={cx('project-card-deadline', overdue && 'project-card-deadline-overdue')}>
          <Icon name="calendar" size={14} />
          {formatDate(project.deadline)}
        </span>
      </footer>
    </article>
  )
}
