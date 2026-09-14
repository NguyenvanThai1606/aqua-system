/**
 * Backend danh mục CHỨC VỤ — Cloud Firestore (`positions` collection),
 * Phase 15.
 *
 * Cùng phong cách hệt `firestoreDepartmentService.js`: id sinh phía client
 * (`pos-xxxxxxxx`), payload lọc qua `toFirestorePayload`, lỗi bọc qua
 * `wrapFirestoreError`.
 *
 * Đọc mở cho mọi user đã đăng nhập (ô chọn chức vụ ở `PersonnelDetailModal`
 * cần thấy danh mục này cho MỌI người, không riêng admin). Ghi (tạo/xóa)
 * chỉ admin — enforced ở `firestore.rules`, không chỉ ở đây.
 *
 * `User.position` (Phase 10) VẪN là một chuỗi tự do trên hồ sơ user —
 * collection này KHÔNG thay đổi field đó, chỉ cung cấp danh sách gợi ý mà
 * admin quản lý được, giữ đúng yêu cầu "không đổi schema hiện có nếu
 * không thực sự cần".
 */

import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { timestampToIso, toFirestorePayload, wrapFirestoreError } from './firestoreUtils'

const COLLECTION = 'positions'

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pos-${crypto.randomUUID().slice(0, 8)}`
  }
  return `pos-${Math.random().toString(36).slice(2, 10)}`
}

function fromFirestore(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    name: typeof data.name === 'string' ? data.name : '',
    createdAt: timestampToIso(data.createdAt),
  }
}

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

/** Danh sách toàn bộ chức vụ — mọi user đã đăng nhập đọc được. */
export async function listPositions() {
  const db = getDbOrThrow()

  try {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs
      .map(fromFirestore)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  } catch (error) {
    throw wrapFirestoreError(error, 'listPositions')
  }
}

/** [Chỉ admin — enforced bởi Firestore Rules] Tạo chức vụ mới. */
export async function createPosition(data) {
  const db = getDbOrThrow()
  const name = data.name?.trim() ?? ''
  if (!name) throw new Error('Tên chức vụ không được để trống.')

  const now = new Date().toISOString()
  const position = {
    id: newId(),
    name,
    createdAt: now,
  }

  try {
    await setDoc(doc(db, COLLECTION, position.id), toFirestorePayload(position))
    return structuredClone(position)
  } catch (error) {
    throw wrapFirestoreError(error, 'createPosition')
  }
}

/** [Chỉ admin — enforced bởi Firestore Rules] Xóa một chức vụ khỏi danh mục.
 *
 * KHÔNG đổi `position` của các user đang dùng tên chức vụ này — field đó
 * vẫn là chuỗi tự do trên hồ sơ user, không tham chiếu ngược lại document
 * này, nên xóa khỏi danh mục không làm mất/hỏng dữ liệu nhân sự đã gán.
 */
export async function deletePosition(id) {
  const db = getDbOrThrow()

  try {
    await deleteDoc(doc(db, COLLECTION, id))
    return id
  } catch (error) {
    throw wrapFirestoreError(error, 'deletePosition')
  }
}
