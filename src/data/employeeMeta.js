/**
 * Metadata cho trạng thái làm việc — dùng ở module Nhân sự (Phase 10).
 * Cùng phong cách với `data/projectMeta.js` (danh sách trạng thái + tra cứu).
 */

export const EMPLOYMENT_STATUSES = [
  { id: 'active', label: 'Đang làm việc', tone: 'success' },
  { id: 'on_leave', label: 'Tạm nghỉ', tone: 'warning' },
  { id: 'resigned', label: 'Đã nghỉ việc', tone: 'neutral' },
]

/** Trạng thái mặc định khi chưa được admin thiết lập. */
export const DEFAULT_EMPLOYMENT_STATUS = 'active'

const STATUS_MAP = new Map(EMPLOYMENT_STATUSES.map((item) => [item.id, item]))

/** Tra cứu nhãn + tone hiển thị cho một `employmentStatus`. */
export function getEmploymentStatusMeta(id) {
  return STATUS_MAP.get(id) ?? STATUS_MAP.get(DEFAULT_EMPLOYMENT_STATUS)
}
