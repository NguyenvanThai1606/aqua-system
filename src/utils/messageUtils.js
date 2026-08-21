/**
 * Hàm thuần dùng chung cho module TIN NHẮN (Phase 12).
 * Cùng nguyên tắc với `utils/calendarUtils.js` / `utils/attendanceUtils.js`.
 */

/** Thời điểm hiển thị trong danh sách cuộc trò chuyện — ngắn gọn theo độ gần. */
export function formatConversationTime(iso) {
  if (!iso) return ''

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: sameYear ? undefined : 'numeric',
  })
}

/** 'HH:MM' — dùng cho mốc giờ bên trong khung chat. */
export function formatMessageTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function truncate(text, max = 64) {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

/** Người còn lại trong một cuộc trò chuyện 1–1 (khác với `uid` hiện tại). */
export function getOtherParticipant(conversation, uid) {
  return conversation?.participants?.find((person) => person.id !== uid) ?? null
}

export function unreadCountOf(conversation, uid) {
  return conversation?.unreadCounts?.[uid] ?? 0
}

/** true nếu là cuộc trò chuyện nhóm (Phase 12.x) — false/undefined nghĩa là chat 1–1. */
export function isGroupConversation(conversation) {
  return conversation?.type === 'group'
}

/** Tên hiển thị dùng chung cho danh sách/khung chat — nhóm dùng `name`, 1–1 dùng tên người còn lại. */
export function getConversationTitle(conversation, uid) {
  if (isGroupConversation(conversation)) return conversation.name || 'Nhóm chat'
  return getOtherParticipant(conversation, uid)?.name ?? 'Người dùng'
}

/** Props avatar dùng chung — nhóm dùng `photoURL` riêng nếu có, không thì fallback về chữ cái đầu của tên nhóm. */
export function getConversationAvatarProps(conversation, uid) {
  if (isGroupConversation(conversation)) {
    return { name: conversation.name || 'Nhóm chat', photoURL: conversation.photoURL || null, initials: undefined }
  }

  const other = getOtherParticipant(conversation, uid)
  return { name: other?.name, photoURL: other?.photoURL, initials: other?.initials }
}

/** Sắp xếp cuộc trò chuyện theo tin nhắn gần nhất — mới nhất lên đầu. */
export function sortConversationsByRecency(conversations) {
  return [...conversations].sort((a, b) =>
    (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''),
  )
}
