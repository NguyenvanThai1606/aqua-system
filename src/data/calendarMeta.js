/**
 * Metadata cho module LỊCH (Phase 11).
 * Cùng phong cách với `data/taskMeta.js` / `data/employeeMeta.js`: UI chỉ
 * đọc nhãn/tone từ đây, không viết cứng chuỗi tiếng Việt rải rác trong JSX.
 */

/**
 * Phạm vi một sự kiện:
 *  - 'personal': lịch cá nhân — chỉ người tạo (owner) được sửa/xóa.
 *  - 'company': lịch chung của công ty — chỉ admin được tạo/sửa/xóa,
 *    nhưng mọi user đã đăng nhập đều xem được (giống cách Project/Task
 *    đang mở quyền đọc cho toàn bộ user — xem `firestore.rules`).
 */
export const EVENT_SCOPES = [
  { id: 'personal', label: 'Cá nhân', tone: 'info' },
  { id: 'company', label: 'Chung công ty', tone: 'primary' },
]

export const DEFAULT_SCOPE = 'personal'

const SCOPE_MAP = new Map(EVENT_SCOPES.map((item) => [item.id, item]))

export function getScopeMeta(id) {
  return SCOPE_MAP.get(id) ?? SCOPE_MAP.get(DEFAULT_SCOPE)
}

/** Ba chế độ xem của trang /lich — thứ tự cũng là thứ tự nút chuyển đổi. */
export const CALENDAR_VIEWS = [
  { id: 'month', label: 'Tháng' },
  { id: 'week', label: 'Tuần' },
  { id: 'day', label: 'Ngày' },
]

export const DEFAULT_VIEW = 'month'

/** Tên thứ trong tuần, bắt đầu từ Thứ Hai — dùng cho header lưới tháng/tuần. */
export const WEEKDAY_LABELS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
export const WEEKDAY_LABELS_FULL = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
]
