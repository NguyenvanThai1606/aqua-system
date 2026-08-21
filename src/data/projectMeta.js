/**
 * Từ điển trạng thái dự án.
 * UI chỉ đọc từ đây, không tự viết nhãn tiếng Việt trong JSX.
 */

/** Thứ tự trong mảng cũng là thứ tự hiển thị trong ô chọn trạng thái. */
export const PROJECT_STATUSES = [
  { id: 'planning', label: 'Lên kế hoạch', tone: 'neutral' },
  { id: 'active', label: 'Đang chạy', tone: 'info' },
  { id: 'on-hold', label: 'Tạm dừng', tone: 'warning' },
  { id: 'completed', label: 'Hoàn thành', tone: 'success' },
  { id: 'cancelled', label: 'Đã hủy', tone: 'danger' },
]

/** Trạng thái kết thúc — dự án ở các trạng thái này không bị tính quá hạn. */
export const CLOSED_STATUSES = ['completed', 'cancelled']

export const DEFAULT_PROJECT_STATUS = 'planning'

const STATUS_MAP = new Map(PROJECT_STATUSES.map((item) => [item.id, item]))

/** Luôn trả về một object hợp lệ để UI không phải kiểm tra null. */
export function getProjectStatusMeta(id) {
  return STATUS_MAP.get(id) ?? { id, label: id, tone: 'neutral' }
}

export function isClosedStatus(id) {
  return CLOSED_STATUSES.includes(id)
}
