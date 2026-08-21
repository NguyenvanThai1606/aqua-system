/**
 * Hàm thuần dùng chung cho module công việc:
 * tính quá hạn, tiến độ checklist, lọc và sắp xếp.
 */

import { DONE_STATUS, getPriorityMeta } from '../data/taskMeta'

/** Mốc 00:00 hôm nay — deadline đúng hôm nay chưa bị coi là quá hạn. */
export function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Đọc chuỗi 'YYYY-MM-DD' theo giờ địa phương, tránh lệch múi giờ của Date. */
export function parseDeadline(value) {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date
}

export function isValidDeadline(value) {
  return value === '' || parseDeadline(value) !== null
}

export function isOverdue(task) {
  if (task.status === DONE_STATUS) return false

  const deadline = parseDeadline(task.deadline)
  return deadline !== null && deadline < startOfToday()
}

export function countOverdue(tasks) {
  return tasks.reduce((total, task) => total + (isOverdue(task) ? 1 : 0), 0)
}

/** Số ngày còn lại tới deadline (âm là đã quá hạn), null nếu không có deadline. */
export function daysUntilDeadline(task) {
  const deadline = parseDeadline(task.deadline)
  if (!deadline) return null

  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return Math.round((deadline - startOfToday()) / MS_PER_DAY)
}

export function formatDeadline(value) {
  const date = parseDeadline(value)
  if (!date) return 'Chưa đặt hạn'

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getChecklistProgress(checklist = []) {
  const total = checklist.length
  const completed = checklist.filter((item) => item.completed).length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return { total, completed, percent }
}

/** Áp dụng đồng thời mọi bộ lọc — điều kiện rỗng nghĩa là không lọc. */
export function filterTasks(tasks, { keyword = '', status = 'all', priority = 'all', assignee = 'all' } = {}) {
  const needle = keyword.trim().toLowerCase()

  return tasks.filter((task) => {
    if (status !== 'all' && task.status !== status) return false
    if (priority !== 'all' && task.priority !== priority) return false

    if (assignee !== 'all') {
      const assigneeId = task.assignee?.id ?? 'unassigned'
      if (assigneeId !== assignee) return false
    }

    if (needle) {
      const haystack = `${task.title} ${task.description}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }

    return true
  })
}

/** Trong cột: việc quá hạn lên trước, rồi tới ưu tiên cao, rồi tới deadline gần. */
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a))
    if (overdueDiff !== 0) return overdueDiff

    const priorityDiff =
      getPriorityMeta(b.priority).weight - getPriorityMeta(a.priority).weight
    if (priorityDiff !== 0) return priorityDiff

    const aDeadline = parseDeadline(a.deadline)
    const bDeadline = parseDeadline(b.deadline)
    if (aDeadline && bDeadline) return aDeadline - bDeadline
    if (aDeadline) return -1
    if (bDeadline) return 1

    return 0
  })
}

/** Gom việc theo trạng thái để dựng các cột Kanban. */
export function groupByStatus(tasks, statuses) {
  const groups = new Map(statuses.map((status) => [status.id, []]))

  tasks.forEach((task) => {
    const bucket = groups.get(task.status)
    if (bucket) bucket.push(task)
  })

  return statuses.map((status) => ({
    status,
    tasks: sortTasks(groups.get(status.id) ?? []),
  }))
}
