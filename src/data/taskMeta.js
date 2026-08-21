/**
 * Từ điển trạng thái & mức ưu tiên của công việc.
 * UI chỉ đọc từ đây, không tự viết nhãn tiếng Việt trong JSX.
 */

/** Thứ tự trong mảng cũng là thứ tự cột trên bảng Kanban. */
export const TASK_STATUSES = [
  { id: 'todo', label: 'Chưa làm', tone: 'neutral' },
  { id: 'in-progress', label: 'Đang làm', tone: 'info' },
  { id: 'blocked', label: 'Chờ xử lý', tone: 'warning' },
  { id: 'done', label: 'Hoàn thành', tone: 'success' },
]

/** Thấp -> Khẩn cấp. `weight` dùng để xếp thứ tự thẻ trong cột. */
export const TASK_PRIORITIES = [
  { id: 'low', label: 'Thấp', tone: 'neutral', weight: 1 },
  { id: 'medium', label: 'Trung bình', tone: 'info', weight: 2 },
  { id: 'high', label: 'Cao', tone: 'warning', weight: 3 },
  { id: 'urgent', label: 'Khẩn cấp', tone: 'danger', weight: 4 },
]

/** Trạng thái kết thúc — việc ở trạng thái này không bị tính quá hạn. */
export const DONE_STATUS = 'done'

export const DEFAULT_STATUS = 'todo'
export const DEFAULT_PRIORITY = 'medium'

const STATUS_MAP = new Map(TASK_STATUSES.map((item) => [item.id, item]))
const PRIORITY_MAP = new Map(TASK_PRIORITIES.map((item) => [item.id, item]))

/** Luôn trả về một object hợp lệ để UI không phải kiểm tra null. */
export function getStatusMeta(id) {
  return STATUS_MAP.get(id) ?? { id, label: id, tone: 'neutral' }
}

export function getPriorityMeta(id) {
  return PRIORITY_MAP.get(id) ?? { id, label: id, tone: 'neutral', weight: 0 }
}
