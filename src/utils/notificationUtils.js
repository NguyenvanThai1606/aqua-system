/**
 * Hàm thuần dùng chung cho module THÔNG BÁO (Phase 14).
 * Cùng nguyên tắc với `utils/messageUtils.js`/`utils/calendarUtils.js`.
 */

const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

/** Thời gian tương đối kiểu "5 phút trước" — dùng cho danh sách thông báo. */
export function formatRelativeTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000)

  if (diffSeconds < 10) return 'Vừa xong'
  if (diffSeconds < MINUTE) return `${diffSeconds} giây trước`
  if (diffSeconds < HOUR) return `${Math.floor(diffSeconds / MINUTE)} phút trước`
  if (diffSeconds < DAY) return `${Math.floor(diffSeconds / HOUR)} giờ trước`
  if (diffSeconds < DAY * 7) return `${Math.floor(diffSeconds / DAY)} ngày trước`

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Metadata hiển thị theo `type` — icon + nhãn nhóm. Chỉ liệt kê các loại
 * THẬT SỰ được phát sinh trong source hiện tại (xem
 * `TasksProvider`/`ProjectsProvider`/`MessagesProvider`) — không suy đoán
 * loại chưa tồn tại.
 */
const TYPE_META = {
  task_assigned: { icon: 'tasks', label: 'Công việc' },
  task_updated: { icon: 'tasks', label: 'Công việc' },
  project_manager_assigned: { icon: 'projects', label: 'Dự án' },
  group_added: { icon: 'messages', label: 'Tin nhắn nhóm' },
  event_invited: { icon: 'calendar', label: 'Lịch' },
  event_updated: { icon: 'calendar', label: 'Lịch' },
  event_cancelled: { icon: 'calendar', label: 'Lịch' },
}

export function getNotificationIcon(notification) {
  return TYPE_META[notification?.type]?.icon ?? 'bell'
}

export function getNotificationTypeLabel(notification) {
  return TYPE_META[notification?.type]?.label ?? 'Hệ thống'
}

/**
 * Route điều hướng tới khi bấm vào một thông báo — dựa vào
 * `relatedType`/`relatedId`. Trả về `null` nếu không có route phù hợp
 * (thông báo vẫn hiển thị được, chỉ không click-through).
 *
 * Lưu ý kiến trúc hiện tại: `/cong-viec` và `/du-an` không có route con
 * theo id (Kanban/danh sách mở modal chi tiết TỪ BÊN TRONG trang, không
 * đọc id từ URL) — nên chỉ điều hướng được tới TRANG chứa, không tới
 * đúng modal đang mở. Đây là giới hạn thật của route hiện có, không phải
 * thiếu sót của module Thông báo.
 */
export function getNotificationLinkPath(notification) {
  switch (notification?.relatedType) {
    case 'task':
      return '/cong-viec'
    case 'project':
      return '/du-an'
    case 'conversation':
      return '/tin-nhan'
    case 'event':
      // Kiến trúc `/lich` hiện tại (CalendarPage) không đọc id sự kiện từ
      // URL — chỉ điều hướng tới trang, không tự mở đúng sự kiện. Đúng
      // giới hạn đã ghi ở trên cho `task`/`project`, không tự tạo route
      // mới `/lich/:id`.
      return '/lich'
    default:
      return null
  }
}
