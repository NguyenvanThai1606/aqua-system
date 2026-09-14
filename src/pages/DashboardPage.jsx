import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Icon from '../components/Icon'
import { DONE_STATUS, getStatusMeta } from '../data/taskMeta'
import { getProjectStatusMeta, isClosedStatus } from '../data/projectMeta'
import { useTasks } from '../utils/tasksContext'
import { useProjects } from '../utils/projectsContext'
import {
  daysUntilDeadline as taskDaysUntil,
  formatDeadline,
  isOverdue,
  sortTasks,
} from '../utils/taskUtils'
import {
  daysUntilDeadline as projectDaysUntil,
  calculateProjectProgress,
  formatDate,
  isProjectOverdue,
  sortProjects,
} from '../utils/projectUtils'
import cx from '../utils/cx'
import '../styles/dashboard.css'

const NOTABLE_TASK_LIMIT = 6
const UPCOMING_PROJECT_LIMIT = 5
const DUE_SOON_DAYS = 7

/** Mô tả deadline ngắn gọn cho danh sách dashboard. */
function taskDeadlineLabel(task) {
  const days = taskDaysUntil(task)
  if (days === null) return 'Chưa đặt hạn'
  if (isOverdue(task)) return `Quá hạn ${Math.abs(days)} ngày`
  if (days === 0) return 'Đến hạn hôm nay'
  if (days === 1) return 'Còn 1 ngày'
  if (days <= DUE_SOON_DAYS) return `Còn ${days} ngày`
  return formatDeadline(task.deadline)
}

/** Mô tả deadline ngắn gọn cho dự án trên dashboard. */
function projectDeadlineLabel(project) {
  const days = projectDaysUntil(project)
  if (days === null) return 'Chưa đặt'
  if (isProjectOverdue(project)) return `Quá hạn ${Math.abs(days)} ngày`
  if (days === 0) return 'Bàn giao hôm nay'
  if (days === 1) return 'Còn 1 ngày'
  return `Còn ${days} ngày`
}

/** Việc đáng chú ý: quá hạn → sắp đến hạn → đang làm. */
function selectNotableTasks(tasks) {
  const open = tasks.filter((task) => task.status !== DONE_STATUS)

  const notable = open.filter(
    (task) =>
      isOverdue(task) ||
      task.status === 'in-progress' ||
      (() => {
        const days = taskDaysUntil(task)
        return days !== null && days >= 0 && days <= DUE_SOON_DAYS
      })(),
  )

  return sortTasks(notable).slice(0, NOTABLE_TASK_LIMIT)
}

/** Dự án sắp bàn giao — deadline gần nhất, bỏ dự án đã đóng. */
function selectUpcomingProjects(projects) {
  const upcoming = projects.filter(
    (project) => !isClosedStatus(project.status) && project.deadline,
  )

  return sortProjects(upcoming).slice(0, UPCOMING_PROJECT_LIMIT)
}

export default function DashboardPage() {
  const { tasks, loading: tasksLoading, overdueCount } = useTasks()
  const { projects, loading: projectsLoading } = useProjects()

  const loading = tasksLoading || projectsLoading

  const stats = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== DONE_STATUS)
    const inProgressCount = tasks.filter((task) => task.status === 'in-progress').length
    const activeProjects = projects.filter((project) => project.status === 'active')
    const upcomingProjects = selectUpcomingProjects(projects)

    return [
      {
        label: 'Tổng công việc',
        value: String(tasks.length),
        hint:
          openTasks.length === tasks.length
            ? 'Tất cả việc chưa hoàn thành'
            : `${openTasks.length} việc chưa hoàn thành`,
      },
      {
        label: 'Công việc đang thực hiện',
        value: String(inProgressCount),
        hint:
          inProgressCount > 0
            ? `${tasks.filter((t) => t.status === 'blocked').length} việc đang chờ xử lý`
            : 'Chưa có việc đang làm',
      },
      {
        label: 'Công việc quá hạn',
        value: String(overdueCount),
        hint: overdueCount > 0 ? 'Cần ưu tiên xử lý' : 'Không có việc quá hạn',
        alert: overdueCount > 0,
      },
      {
        label: 'Dự án đang hoạt động',
        value: String(activeProjects.length),
        hint:
          upcomingProjects.length > 0
            ? `${upcomingProjects.length} dự án sắp tới mốc bàn giao`
            : 'Không có mốc bàn giao sắp tới',
      },
    ]
  }, [tasks, projects, overdueCount])

  const notableTasks = useMemo(() => selectNotableTasks(tasks), [tasks])
  const upcomingProjects = useMemo(() => selectUpcomingProjects(projects), [projects])

  return (
    <>
      <PageHeader
        icon="dashboard"
        title="Dashboard"
        description="Trang tổng quan toàn bộ hoạt động của doanh nghiệp."
        actions={
          <>
            <Link to="/cong-viec" className="btn btn-secondary">
              <Icon name="tasks" size={16} />
              Công việc
            </Link>
            <Link to="/du-an" className="btn btn-primary">
              <Icon name="projects" size={16} />
              Dự án
            </Link>
          </>
        }
      />

      <div className="dashboard-page">
        <div className="stat-grid">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className={cx('stat-card', stat.alert && 'stat-card-alert')}
            >
              <p className="stat-label">{stat.label}</p>
              <p className={cx('stat-value', stat.alert && 'stat-value-alert')}>{stat.value}</p>
              <p className="stat-hint">{stat.hint}</p>
            </article>
          ))}
        </div>

        <div className="dashboard-columns">
          <Card
            title="Việc cần làm"
            action={
              <Link to="/cong-viec" className="dashboard-card-link">
                Xem tất cả
              </Link>
            }
          >
            {loading ? (
              <p className="dashboard-empty muted">Đang tải công việc…</p>
            ) : notableTasks.length === 0 ? (
              <div className="dashboard-empty">
                <span className="dashboard-empty-icon" aria-hidden="true">
                  <Icon name="tasks" size={22} />
                </span>
                <p className="dashboard-empty-title">Không có việc ưu tiên</p>
                <p className="dashboard-empty-text muted">
                  Các công việc quá hạn, sắp đến hạn hoặc đang thực hiện sẽ hiển thị tại đây.
                </p>
                <Link to="/cong-viec" className="btn btn-secondary dashboard-empty-action">
                  Mở bảng công việc
                </Link>
              </div>
            ) : (
              <ul className="dashboard-list">
                {notableTasks.map((task) => {
                  const status = getStatusMeta(task.status)
                  const overdue = isOverdue(task)
                  const days = taskDaysUntil(task)
                  const dueSoon =
                    !overdue && days !== null && days >= 0 && days <= DUE_SOON_DAYS

                  return (
                    <li key={task.id}>
                      <Link to="/cong-viec" className="dashboard-list-item">
                        <span className="dashboard-list-main">
                          <span className="dashboard-list-title">{task.title}</span>
                          <span className="dashboard-list-meta">
                            <span className={`badge badge-${status.tone}`}>{status.label}</span>
                            {overdue && (
                              <span className="badge badge-danger">Quá hạn</span>
                            )}
                            {dueSoon && !overdue && (
                              <span className="badge badge-warning">Sắp đến hạn</span>
                            )}
                          </span>
                        </span>
                        <span
                          className={cx(
                            'dashboard-list-side',
                            overdue && 'dashboard-list-side-overdue',
                          )}
                        >
                          <Icon name="calendar" size={14} />
                          {taskDeadlineLabel(task)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card
            title="Dự án sắp bàn giao"
            action={
              <Link to="/du-an" className="dashboard-card-link">
                Xem tất cả
              </Link>
            }
          >
            {loading ? (
              <p className="dashboard-empty muted">Đang tải dự án…</p>
            ) : upcomingProjects.length === 0 ? (
              <div className="dashboard-empty">
                <span className="dashboard-empty-icon" aria-hidden="true">
                  <Icon name="projects" size={22} />
                </span>
                <p className="dashboard-empty-title">Không có dự án sắp bàn giao</p>
                <p className="dashboard-empty-text muted">
                  Các dự án đang chạy có deadline gần nhất sẽ hiển thị tại đây.
                </p>
                <Link to="/du-an" className="btn btn-secondary dashboard-empty-action">
                  Mở danh sách dự án
                </Link>
              </div>
            ) : (
              <ul className="dashboard-list">
                {upcomingProjects.map((project) => {
                  const status = getProjectStatusMeta(project.status)
                  const overdue = isProjectOverdue(project)
                  const taskProgress = calculateProjectProgress(tasks, project.id)

                  return (
                    <li key={project.id}>
                      <Link to="/du-an" className="dashboard-list-item">
                        <span className="dashboard-list-main">
                          <span className="dashboard-list-title">{project.name}</span>
                          <span className="dashboard-list-meta">
                            <span className={`badge badge-${status.tone}`}>{status.label}</span>
                            <span className="dashboard-list-progress">
                              {taskProgress.percent}%
                            </span>
                            {overdue && (
                              <span className="badge badge-danger">Quá hạn</span>
                            )}
                          </span>
                        </span>
                        <span
                          className={cx(
                            'dashboard-list-side',
                            overdue && 'dashboard-list-side-overdue',
                          )}
                        >
                          <Icon name="calendar" size={14} />
                          <span>
                            {formatDate(project.deadline)}
                            <span className="dashboard-list-side-hint">
                              {projectDeadlineLabel(project)}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
