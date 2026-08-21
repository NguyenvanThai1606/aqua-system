/**
 * Backend sự kiện lịch — Cloud Firestore (`events` collection, Phase 11).
 *
 * Cùng phong cách với `firestoreTaskService.js` / `firestoreProjectService.js`:
 * id sinh phía client, payload lọc qua `toFirestorePayload`, lỗi bọc qua
 * `wrapFirestoreError`.
 *
 * Đọc mở cho mọi user đã đăng nhập — GIỐNG `projects`/`tasks` (xem
 * `firestore.rules`), vì đây là công cụ phối hợp nội bộ, không phải dữ
 * liệu riêng tư từng người. Ghi (tạo/sửa/xóa) bị giới hạn theo quyền sở
 * hữu/scope — enforced ở `firestore.rules`, KHÔNG chỉ ở tầng UI:
 *  - Sự kiện `scope: 'personal'`: chỉ chủ sự kiện (`ownerId`) sửa/xóa được.
 *  - Sự kiện `scope: 'company'`: chỉ admin tạo được, và chỉ admin sửa/xóa.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { DEFAULT_SCOPE } from '../data/calendarMeta'
import { timestampToIso, toFirestorePayload, wrapFirestoreError } from './firestoreUtils'

const COLLECTION = 'events'

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `evt-${crypto.randomUUID().slice(0, 8)}`
  }
  return `evt-${Math.random().toString(36).slice(2, 10)}`
}

function normalize(input) {
  return {
    title: input.title?.trim() ?? '',
    date: input.date || '',
    startTime: input.startTime || '',
    endTime: input.endTime || '',
    location: input.location?.trim() ?? '',
    description: input.description?.trim() ?? '',
    participants: (input.participants ?? []).map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email ?? null,
      photoURL: person.photoURL ?? null,
      initials: person.initials ?? '?',
    })),
    // Phase 15 — danh sách id thuần, denormalize từ `participants` (cùng
    // kiểu kỹ thuật với `departmentName` denormalize từ `departmentId`
    // ở Phase 10). Lý do tồn tại: Firestore Rules không có cách nào lặp
    // qua `participants` (list các object) để kiểm tra "userId này có
    // trong danh sách tham gia không" khi validate quyền tạo notification
    // lịch (`event_invited`/`event_updated`/`event_cancelled`, xem
    // `firestore.rules` khối `notifications`) — nhưng `in` hoạt động
    // trực tiếp trên một list string phẳng.
    participantIds: (input.participants ?? []).map((person) => person.id).filter(Boolean),
    scope: input.scope === 'company' ? 'company' : DEFAULT_SCOPE,
    ownerId: input.ownerId,
    ownerName: input.ownerName ?? '',
  }
}

function fromFirestore(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt ?? data.createdAt),
  }
}

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

/**
 * KHÔNG gọi `ensureFirestoreSeeded()` — hàm đó chỉ seed `tasks`/`projects`
 * (xem `firestoreInit.js`) từ mock data cũ; `events` là collection MỚI của
 * Phase 11 và cố tình bắt đầu trống, đúng yêu cầu "không tạo dữ liệu mock
 * nếu không cần thiết".
 */
export async function listEvents() {
  const db = getDbOrThrow()

  try {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs
      .map(fromFirestore)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
  } catch (error) {
    throw wrapFirestoreError(error, 'listEvents')
  }
}

export async function createEvent(input) {
  const db = getDbOrThrow()
  const now = new Date().toISOString()

  const event = {
    id: newId(),
    ...normalize(input),
    createdAt: now,
    updatedAt: now,
  }

  try {
    await setDoc(doc(db, COLLECTION, event.id), toFirestorePayload(event))
    return structuredClone(event)
  } catch (error) {
    throw wrapFirestoreError(error, 'createEvent')
  }
}

export async function updateEvent(id, patch) {
  const db = getDbOrThrow()
  const ref = doc(db, COLLECTION, id)

  try {
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) throw new Error(`Không tìm thấy sự kiện ${id}`)

    const current = fromFirestore(snapshot)
    const nextParticipants = patch.participants ?? current.participants
    const updated = {
      ...current,
      ...patch,
      participants: nextParticipants,
      participantIds: nextParticipants.map((person) => person.id).filter(Boolean),
      updatedAt: new Date().toISOString(),
    }
    await updateDoc(ref, toFirestorePayload(updated))
    return structuredClone(updated)
  } catch (error) {
    if (error.message?.startsWith('Không tìm thấy')) throw error
    throw wrapFirestoreError(error, 'updateEvent')
  }
}

export async function deleteEvent(id) {
  const db = getDbOrThrow()

  try {
    await deleteDoc(doc(db, COLLECTION, id))
    return id
  } catch (error) {
    throw wrapFirestoreError(error, 'deleteEvent')
  }
}
