/**
 * Backend tin nhắn — Cloud Firestore (Phase 12).
 *
 * Cấu trúc:
 *  - `conversations/{conversationId}` — một cuộc trò chuyện 1–1. Với chat
 *    1–1, id được sinh TẤT ĐỊNH từ 2 uid đã sắp xếp
 *    (`dm_{uidNhỏHơn}_{uidLớnHơn}` — xem `directConversationId`) để không
 *    bao giờ tạo trùng cuộc trò chuyện giữa cùng một cặp người, kể cả khi
 *    cả hai cùng bấm "Nhắn tin mới" gần như đồng thời.
 *  - `conversations/{conversationId}/messages/{messageId}` — tin nhắn,
 *    subcollection con của conversation tương ứng.
 *
 * Không dùng `receiverId` riêng trên message — 1–1 chat chỉ cần
 * `conversation.participantIds` là đủ xác định "người nhận còn lại", vừa
 * đúng tinh thần "không lưu dữ liệu thừa" của Phase 12, vừa dễ mở rộng
 * sang group chat sau này (participantIds có thể > 2 phần tử) mà không
 * phải đổi schema message.
 *
 * Trạng thái "đã đọc" lưu ở CẤP CONVERSATION (`unreadCounts`/`lastReadAt`,
 * cả hai đều là map theo uid) thay vì ghi lên từng message — tránh phải
 * cập nhật hàng loạt document con mỗi lần user mở lại cuộc trò chuyện.
 *
 * Đọc/ghi bị giới hạn nghiêm ngặt ở `firestore.rules`: chỉ participant của
 * MỘT conversation cụ thể mới đọc được conversation/message đó — kể cả
 * admin cũng KHÔNG có ngoại lệ (xem chú thích trong `firestore.rules`).
 */

import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { timestampToIso } from './firestoreUtils'

const CONVERSATIONS = 'conversations'
const MESSAGES = 'messages'

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

function directConversationId(uidA, uidB) {
  const [first, second] = [uidA, uidB].sort()
  return `dm_${first}_${second}`
}

function conversationFromSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt ?? data.createdAt),
  }
}

function messageFromSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    createdAt: timestampToIso(data.createdAt),
  }
}

/**
 * Realtime danh sách cuộc trò chuyện của `uid` — KHÔNG dùng `orderBy` kèm
 * `array-contains` trong cùng một query Firestore để tránh bắt buộc phải
 * tạo composite index thủ công trên Firebase Console; sắp xếp theo
 * `lastMessageAt` được làm ở client, dữ liệu hội thoại của một người
 * thường chỉ vài chục dòng nên không đáng lo hiệu năng.
 *
 * @returns {() => void} hàm unsubscribe
 */
export function subscribeConversations(uid, callback) {
  const db = getDbOrThrow()
  const q = query(collection(db, CONVERSATIONS), where('participantIds', 'array-contains', uid))

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map(conversationFromSnapshot)
        .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
      callback(list)
    },
    (error) => {
      console.error('[firestoreMessageService] subscribeConversations lỗi:', error)
      callback([])
    },
  )
}

/** Realtime tin nhắn của một cuộc trò chuyện, cũ → mới. */
export function subscribeMessages(conversationId, callback) {
  const db = getDbOrThrow()
  const q = query(
    collection(db, CONVERSATIONS, conversationId, MESSAGES),
    orderBy('createdAt', 'asc'),
  )

  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(messageFromSnapshot)),
    (error) => {
      console.error('[firestoreMessageService] subscribeMessages lỗi:', error)
      callback([])
    },
  )
}

/**
 * Mở cuộc trò chuyện 1–1 giữa `me` và `other` — tạo mới nếu chưa có, trả
 * về cuộc trò chuyện cũ nếu đã tồn tại (KHÔNG tạo trùng). `me`/`other` là
 * person ref dạng `userService.toPersonRef()` (`{id, name, email,
 * photoURL, initials}`).
 */
export async function getOrCreateDirectConversation(me, other) {
  const db = getDbOrThrow()
  const id = directConversationId(me.id, other.id)
  const ref = doc(db, CONVERSATIONS, id)

  const existing = await getDoc(ref)
  if (existing.exists()) return conversationFromSnapshot(existing)

  const now = new Date().toISOString()
  const [firstId, secondId] = [me.id, other.id].sort()
  const participants = firstId === me.id ? [me, other] : [other, me]

  const conversation = {
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

  await setDoc(ref, conversation)
  return { id, ...conversation }
}

/**
 * Gửi tin nhắn — ghi ĐỒNG THỜI (batch) tin nhắn mới VÀ cập nhật
 * `lastMessage`/`lastMessageAt`/`unreadCounts` trên conversation cha, để
 * danh sách cuộc trò chuyện không bao giờ "lệch" khỏi tin nhắn thật.
 */
export async function sendMessage({ conversationId, participantIds, senderId, text }) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Nội dung tin nhắn không được để trống.')

  const db = getDbOrThrow()
  const now = new Date().toISOString()

  const messageRef = doc(collection(db, CONVERSATIONS, conversationId, MESSAGES))
  const conversationRef = doc(db, CONVERSATIONS, conversationId)

  const batch = writeBatch(db)
  batch.set(messageRef, {
    conversationId,
    senderId,
    text: trimmed,
    createdAt: now,
  })

  // Direct chat (Phase 12): `participantIds` luôn có đúng 1 người khác
  // ngoài senderId, nên vòng lặp dưới đây tương đương hệt hành vi cũ
  // (`unreadCounts.${otherId}`). Group chat (Phase 12.x): tăng unread cho
  // MỌI participant khác — không riêng một người.
  const conversationUpdate = {
    lastMessage: { text: trimmed, senderId, createdAt: now },
    lastMessageAt: now,
    updatedAt: now,
  }
  participantIds
    .filter((uid) => uid !== senderId)
    .forEach((uid) => {
      conversationUpdate[`unreadCounts.${uid}`] = increment(1)
    })
  batch.update(conversationRef, conversationUpdate)

  await batch.commit()
  return { id: messageRef.id, conversationId, senderId, text: trimmed, createdAt: now }
}

/** Đánh dấu đã đọc — CHỈ reset unread/lastReadAt của CHÍNH `uid`. */
export async function markConversationRead(conversationId, uid) {
  const db = getDbOrThrow()
  const now = new Date().toISOString()

  await updateDoc(doc(db, CONVERSATIONS, conversationId), {
    [`unreadCounts.${uid}`]: 0,
    [`lastReadAt.${uid}`]: now,
    updatedAt: now,
  })
}

/**
 * ------------------------------------------------------------------
 * CHAT NHÓM (Phase 12.x) — do Admin quản lý.
 *
 * Không dùng deterministic ID kiểu `dm_...` của chat 1–1 (một group
 * KHÔNG có "cặp uid" cố định). ID sinh bằng chính cơ chế auto-ID của
 * Firestore (`doc(collection(db, CONVERSATIONS)).id`), gắn tiền tố
 * `group_` để phân biệt trực quan với `dm_...` khi debug — KHÔNG bao giờ
 * dùng tên nhóm làm document ID (tên có thể đổi, có thể trùng).
 *
 * `participants` tiếp tục dùng đúng shape person ref của
 * `userService.toPersonRef()` (`{id, name, email, photoURL, initials}`)
 * — cùng convention với chat 1–1, không tạo shape dữ liệu mới.
 * ------------------------------------------------------------------
 */

function dedupeParticipants(peopleLists) {
  const map = new Map()
  peopleLists.flat().forEach((person) => {
    if (person?.id) map.set(person.id, person)
  })
  return Array.from(map.values())
}

/**
 * Tạo cuộc trò chuyện nhóm — CHỈ admin gọi được (enforced ở
 * `firestore.rules`). `creator` luôn được tự động thêm vào nhóm (kể cả
 * nếu không có mặt trong `members`) vì rule bắt buộc `createdBy` phải là
 * một participant.
 *
 * `description`/`photoURL` LUÔN được ghi (dù rỗng/null) — KHÔNG bao giờ
 * bỏ field khi không nhập, để `firestore.rules` không phải xử lý "field
 * có thể vắng mặt" (đơn giản + khớp field-lock `hasOnly()` ở update).
 * `photoURL` chỉ nhận URL người dùng tự dán vào — dự án KHÔNG dùng
 * Firebase Storage nên không có bước upload ảnh.
 */
export async function createGroupConversation({ creator, name, description, photoURL, members }) {
  if (!creator?.id) throw new Error('Thiếu thông tin người tạo nhóm.')

  const trimmedName = name?.trim()
  if (!trimmedName) throw new Error('Tên nhóm không được để trống.')

  const participants = dedupeParticipants([[creator], members ?? []])
  const participantIds = participants.map((person) => person.id)

  if (participantIds.length < 2) {
    throw new Error('Nhóm cần ít nhất 2 thành viên (kể cả bạn).')
  }

  const db = getDbOrThrow()
  const id = `group_${doc(collection(db, CONVERSATIONS)).id}`
  const ref = doc(db, CONVERSATIONS, id)
  const now = new Date().toISOString()

  const conversation = {
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

  await setDoc(ref, conversation)
  return { id, ...conversation }
}

/**
 * Cập nhật thông tin nhóm (tên/mô tả/ảnh) — CHỈ admin/đang là participant
 * (enforced ở rules). Nhận patch một phần (`{name}`, `{description}`,
 * `{photoURL}`, hoặc kết hợp) — field nào KHÔNG có trong `patch` thì
 * KHÔNG bị đụng tới trên Firestore (dùng `updateDoc` từng phần, không
 * ghi đè cả field kia về rỗng).
 */
export async function updateGroupConversation(conversationId, { name, description, photoURL } = {}) {
  const payload = { updatedAt: new Date().toISOString() }

  if (name !== undefined) {
    const trimmedName = name.trim()
    if (!trimmedName) throw new Error('Tên nhóm không được để trống.')
    payload.name = trimmedName
  }
  if (description !== undefined) {
    payload.description = description?.trim() ?? ''
  }
  if (photoURL !== undefined) {
    payload.photoURL = photoURL?.trim() || null
  }

  const db = getDbOrThrow()
  await updateDoc(doc(db, CONVERSATIONS, conversationId), payload)
}

/**
 * Thêm thành viên vào nhóm — nhận `conversation` hiện tại (từ state đã
 * subscribe) để tính lại TOÀN BỘ `participantIds`/`participants` ở
 * client rồi ghi đè, thay vì dùng `arrayUnion` — vì rules Phase 12.x
 * validate `participants.size() == participantIds.size()`, ghi đè trọn
 * vẹn cả hai mảng đảm bảo chúng luôn khớp nhau tuyệt đối.
 */
export async function addGroupParticipants(conversation, newMembers) {
  const participants = dedupeParticipants([conversation.participants ?? [], newMembers ?? []])
  const participantIds = participants.map((person) => person.id)

  const db = getDbOrThrow()
  await updateDoc(doc(db, CONVERSATIONS, conversation.id), {
    participantIds,
    participants,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Xóa MỘT thành viên khỏi nhóm — không cho xóa `createdBy` (người tạo
 * nhóm), và luôn phải còn lại tối thiểu 2 thành viên sau khi xóa (khớp
 * điều kiện `participantIds.size() >= 2` ở rules).
 */
export async function removeGroupParticipant(conversation, uid) {
  if (uid === conversation.createdBy) {
    throw new Error('Không thể xóa người tạo nhóm.')
  }

  const participants = (conversation.participants ?? []).filter((person) => person.id !== uid)
  const participantIds = participants.map((person) => person.id)

  if (participantIds.length < 2) {
    throw new Error('Nhóm cần giữ lại ít nhất 2 thành viên.')
  }

  const db = getDbOrThrow()
  await updateDoc(doc(db, CONVERSATIONS, conversation.id), {
    participantIds,
    participants,
    updatedAt: new Date().toISOString(),
  })
}
