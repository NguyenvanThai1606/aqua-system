/**
 * Metadata cho module CHẤM CÔNG (Phase 11).
 * Cùng phong cách với `data/taskMeta.js`: UI chỉ đọc nhãn/tone từ đây.
 */

/**
 * Khung giờ làm việc MẶC ĐỊNH — dùng làm cơ sở xác định "đi muộn"/"về sớm"
 * khi KHÔNG tìm thấy sự kiện lịch nào của người dùng trong ngày chấm công
 * (xem `utils/attendanceUtils.js#getWorkScheduleForDate`). Nếu ngày đó có
 * sự kiện lịch (Phase 11 — liên kết Lịch ↔ Chấm công), giờ bắt đầu/kết
 * thúc của sự kiện sẽ được ưu tiên dùng thay cho khung giờ này.
 */
export const DEFAULT_WORK_SCHEDULE = { start: '08:00', end: '17:00' }

/** Trạng thái chấm công VÀO. */
export const CHECK_IN_STATUSES = [
  { id: 'on_time', label: 'Đúng giờ', tone: 'success' },
  { id: 'late', label: 'Đi muộn', tone: 'danger' },
]

/** Trạng thái chấm công RA. */
export const CHECK_OUT_STATUSES = [
  { id: 'on_time', label: 'Đúng giờ', tone: 'success' },
  { id: 'early', label: 'Về sớm', tone: 'warning' },
]

/** Trạng thái tổng quan của MỘT ngày công — dùng cho badge tổng hợp. */
export const DAY_STATUSES = [
  { id: 'not_checked_in', label: 'Chưa chấm công', tone: 'neutral' },
  { id: 'checked_in', label: 'Đang làm việc', tone: 'info' },
  { id: 'completed', label: 'Đã chấm công', tone: 'success' },
]

const CHECK_IN_MAP = new Map(CHECK_IN_STATUSES.map((item) => [item.id, item]))
const CHECK_OUT_MAP = new Map(CHECK_OUT_STATUSES.map((item) => [item.id, item]))
const DAY_STATUS_MAP = new Map(DAY_STATUSES.map((item) => [item.id, item]))

export function getCheckInStatusMeta(id) {
  return CHECK_IN_MAP.get(id) ?? null
}

export function getCheckOutStatusMeta(id) {
  return CHECK_OUT_MAP.get(id) ?? null
}

export function getDayStatusMeta(id) {
  return DAY_STATUS_MAP.get(id) ?? DAY_STATUS_MAP.get('not_checked_in')
}
