/**
 * Backend tin nhắn — localStorage + in-memory (fallback khi chưa cấu hình
 * Firebase). Cùng phong cách với `localEventService.js`/`localTaskService.js`.
 * KHÔNG seed dữ liệu mẫu — collection bắt đầu trống.
 *
 * Firestore có `onSnapshot` thật; ở đây không có server nào để lắng nghe,
 * nên "realtime" được giả lập bằng một pub/sub NỘI BỘ trong cùng tab: mọi
 * hàm ghi (gửi tin, đánh dấu đã đọc…) sau khi cập nhật store sẽ gọi thẳng
 * các callback đang subscribe — KHÔNG polling, giữ đúng tinh thần
 * "event-driven" của bản Firestore thật. Giới hạn: hai tab trình duyệt
 * khác nhau (hai "user" giả lập) sẽ KHÔNG thấy tin nhắn của nhau realtime
 * vì mỗi tab có localStorage/module state riêng — đây là giới hạn cố hữu
 * của fallback dev, không phải lỗi triển khai (ghi rõ ở README/báo cáo).
 */

import { loadCollection, saveCollection } from '../utils/collectionStorage'

const CONV_KEY = 'aqua:conversations'
const MSG_KEY = 'aqua:messages'

let conversations = loadCollection(CONV_KEY, [])
let messages = loadCollection(MSG_KEY, [])

/** uid -> Set<callback(list)> */
const conversationListeners = new Map()
/** conversationId -> Set<callback(list)> */
const messageListeners = new Map()

function persistConversations() {
  saveCollection(CONV_KEY, conversations)
}

function persistMessages() {
  saveCollection(MSG_KEY, messages)
}

function conversationsFor(uid) {
  return conversations
    .filter((conversation) => conversation.participantIds.includes(uid))
    .map((conversation) => structuredClone(conversation))
    .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
}

function messagesFor(conversationId) {
  return messages
    .filter((message) => message.conversationId === conversationId)
    .map((message) => structuredClone(message))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function emitConversations(uid) {
  conversationListeners.get(uid)?.forEach((callback) => callback(conversationsFor(uid)))
}

function emitMessages(conversationId) {
  messageListeners.get(conversationId)?.forEach((callback) => callback(messagesFor(conversationId)))
}

/** Mọi uid có thể bị ảnh hưởng bởi một thay đổi trên `conversation` (cả hai phía). */
function notifyParticipants(conversation) {
  conversation.participantIds.forEach((uid) => emitConversations(uid))
}

export function subscribeConversations(uid, callback) {
  if (!conversationListeners.has(uid)) conversationListeners.set(uid, new Set())
  conversationListeners.get(uid).add(callback)
  callback(conversationsFor(uid))

  return () => {
    conversationListeners.get(uid)?.delete(callback)
  }
}

export function subscribeMessages(conversationId, callback) {
  if (!messageListeners.has(conversationId)) messageListeners.set(conversationId, new Set())
  messageListeners.get(conversationId).add(callback)
  callback(messagesFor(conversationId))

  return () => {
    messageListeners.get(conversationId)?.delete(callback)
  }
}

function directConversationId(uidA, uidB) {
  const [first, second] = [uidA, uidB].sort()
  return `dm_${first}_${second}`
}

export async function getOrCreateDirectConversation(me, other) {
  const id = directConversationId(me.id, other.id)
  const existing = conversations.find((conversation) => conversation.id === id)
  if (existing) return structuredClone(existing)

  const now = new Date().toISOString()
  const [firstId, secondId] = [me.id, other.id].sort()
  const participants = firstId === me.id ? [me, other] : [other, me]

  const conversation = {
    id,
    type: 'direct',
    participantIds: [firstId, secondId],
    participants,
    lastMessage: null,
    lastMessageAt: now,
    unreadCounts: { [me.id]: 0, [other.id]: 0 },
    lastReadAt: { [me.id]: now },
    createdAt: now,
    updatedAt: now,
  }

  conversations = [conversation, ...conversations]
  persistConversations()
  notifyParticipants(conversation)
  return structuredClone(conversation)
}

export async function sendMessage({ conversationId, participantIds, senderId, text }) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Nội dung tin nhắn không được để trống.')

  const now = new Date().toISOString()
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const message = {
    id,
    conversationId,
    senderId,
    text: trimmed,
    createdAt: now,
  }

  messages = [...messages, message]
  persistMessages()

  conversations = conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation

    const nextUnreadCounts = { ...conversation.unreadCounts }
    participantIds
      .filter((uid) => uid !== senderId)
      .forEach((uid) => {
        nextUnreadCounts[uid] = (nextUnreadCounts[uid] ?? 0) + 1
      })

    return {
      ...conversation,
      lastMessage: { text: trimmed, senderId, createdAt: now },
      lastMessageAt: now,
      unreadCounts: nextUnreadCounts,
      updatedAt: now,
    }
  })
  persistConversations()

  emitMessages(conversationId)
  const updated = conversations.find((conversation) => conversation.id === conversationId)
  if (updated) notifyParticipants(updated)

  return structuredClone(message)
}

export async function markConversationRead(conversationId, uid) {
  const now = new Date().toISOString()

  conversations = conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation

    return {
      ...conversation,
      unreadCounts: { ...conversation.unreadCounts, [uid]: 0 },
      lastReadAt: { ...conversation.lastReadAt, [uid]: now },
      updatedAt: now,
    }
  })
  persistConversations()

  const updated = conversations.find((conversation) => conversation.id === conversationId)
  if (updated) notifyParticipants(updated)
}

/**
 * ------------------------------------------------------------------
 * CHAT NHÓM (Phase 12.x) — bản local fallback, cùng nguyên tắc với
 * `firestoreMessageService.js` (xem chú thích ở đó). Không có server để
 * enforce quyền admin ở đây — UI (`isAdmin` từ `useAuth()`) là lớp chặn
 * duy nhất trong fallback dev, bản Firestore thật mới có Security Rules.
 * ------------------------------------------------------------------
 */

function dedupeParticipants(peopleLists) {
  const map = new Map()
  peopleLists.flat().forEach((person) => {
    if (person?.id) map.set(person.id, person)
  })
  return Array.from(map.values())
}

export async function createGroupConversation({ creator, name, description, photoURL, members }) {
  if (!creator?.id) throw new Error('Thiếu thông tin người tạo nhóm.')

  const trimmedName = name?.trim()
  if (!trimmedName) throw new Error('Tên nhóm không được để trống.')

  const participants = dedupeParticipants([[creator], members ?? []])
  const participantIds = participants.map((person) => person.id)

  if (participantIds.length < 2) {
    throw new Error('Nhóm cần ít nhất 2 thành viên (kể cả bạn).')
  }

  const now = new Date().toISOString()
  const id = `group_${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const conversation = {
    id,
    type: 'group',
    name: trimmedName,
    description: description?.trim() ?? '',
    photoURL: photoURL?.trim() || null,
    participantIds,
    participants,
    createdBy: creator.id,
    lastMessage: null,
    lastMessageAt: now,
    unreadCounts: Object.fromEntries(participantIds.map((uid) => [uid, 0])),
    lastReadAt: { [creator.id]: now },
    createdAt: now,
    updatedAt: now,
  }

  conversations = [conversation, ...conversations]
  persistConversations()
  notifyParticipants(conversation)
  return structuredClone(conversation)
}

export async function updateGroupConversation(conversationId, { name, description, photoURL } = {}) {
  const now = new Date().toISOString()

  conversations = conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation

    const next = { ...conversation, updatedAt: now }
    if (name !== undefined) {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Tên nhóm không được để trống.')
      next.name = trimmedName
    }
    if (description !== undefined) next.description = description?.trim() ?? ''
    if (photoURL !== undefined) next.photoURL = photoURL?.trim() || null
    return next
  })
  persistConversations()

  const updated = conversations.find((conversation) => conversation.id === conversationId)
  if (updated) notifyParticipants(updated)
}

export async function addGroupParticipants(conversation, newMembers) {
  const participants = dedupeParticipants([conversation.participants ?? [], newMembers ?? []])
  const participantIds = participants.map((person) => person.id)
  const now = new Date().toISOString()

  conversations = conversations.map((item) =>
    item.id === conversation.id ? { ...item, participantIds, participants, updatedAt: now } : item,
  )
  persistConversations()

  const updated = conversations.find((item) => item.id === conversation.id)
  if (updated) notifyParticipants(updated)
}

export async function removeGroupParticipant(conversation, uid) {
  if (uid === conversation.createdBy) {
    throw new Error('Không thể xóa người tạo nhóm.')
  }

  const participants = (conversation.participants ?? []).filter((person) => person.id !== uid)
  const participantIds = participants.map((person) => person.id)

  if (participantIds.length < 2) {
    throw new Error('Nhóm cần giữ lại ít nhất 2 thành viên.')
  }

  const now = new Date().toISOString()
  conversations = conversations.map((item) =>
    item.id === conversation.id ? { ...item, participantIds, participants, updatedAt: now } : item,
  )
  persistConversations()

  // Người vừa bị xóa không còn nằm trong `participantIds` mới, nên
  // `notifyParticipants(updated)` một mình sẽ KHÔNG báo lại cho họ (group
  // sẽ không tự biến mất khỏi danh sách của họ). Báo trực tiếp cho `uid`
  // bằng `emitConversations` để họ cũng thấy cập nhật realtime.
  const updated = conversations.find((item) => item.id === conversation.id)
  if (updated) notifyParticipants(updated)
  emitConversations(uid)
}
