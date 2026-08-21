/**
 * Backend phòng ban — Cloud Firestore (`departments` collection), Phase 10.
 *
 * Cùng phong cách với `firestoreProjectService.js`: mọi lỗi bọc qua
 * `wrapFirestoreError`, id sinh phía client (`dept-xxxxxxxx`), payload lọc
 * qua `toFirestorePayload` trước khi ghi.
 *
 * Đọc mở cho mọi user đã đăng nhập (phục vụ tab "Cơ cấu tổ chức" cho tất cả),
 * ghi (tạo/sửa/xóa) chỉ admin — enforced ở `firestore.rules`, không chỉ ở
 * đây. Xem thêm `services/userService.js` — nhân viên liên kết với phòng
 * ban bằng `departmentId` (uid thật của document phòng ban), không dùng dữ
 * liệu giả.
 */

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { timestampToIso, toFirestorePayload, wrapFirestoreError } from './firestoreUtils'

const COLLECTION = 'departments'

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `dept-${crypto.randomUUID().slice(0, 8)}`
  }
  return `dept-${Math.random().toString(36).slice(2, 10)}`
}

function normalize(input) {
  return {
    name: input.name?.trim() ?? '',
    description: input.description?.trim() ?? '',
    managerId: input.managerId || null,
    managerName: input.managerName?.trim() || null,
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

/** Danh sách toàn bộ phòng ban — mọi user đã đăng nhập đọc được (Phase 10). */
export async function listDepartments() {
  const db = getDbOrThrow()

  try {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs
      .map(fromFirestore)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  } catch (error) {
    throw wrapFirestoreError(error, 'listDepartments')
  }
}

/** [Chỉ admin — enforced bởi Firestore Rules] Tạo phòng ban mới. */
export async function createDepartment(data) {
  const db = getDbOrThrow()

  const now = new Date().toISOString()
  const department = {
    id: newId(),
    ...normalize(data),
    createdAt: now,
    updatedAt: now,
  }

  try {
    await setDoc(doc(db, COLLECTION, department.id), toFirestorePayload(department))
    return structuredClone(department)
  } catch (error) {
    throw wrapFirestoreError(error, 'createDepartment')
  }
}

/** [Chỉ admin — enforced bởi Firestore Rules] Sửa phòng ban. */
export async function updateDepartment(id, data) {
  const db = getDbOrThrow()
  const ref = doc(db, COLLECTION, id)

  try {
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) throw new Error(`Không tìm thấy phòng ban ${id}`)

    const current = fromFirestore(snapshot)
    const updated = {
      ...current,
      ...normalize({ ...current, ...data }),
      updatedAt: new Date().toISOString(),
    }
    await updateDoc(ref, toFirestorePayload(updated))
    return structuredClone(updated)
  } catch (error) {
    if (error.message?.startsWith('Không tìm thấy')) throw error
    throw wrapFirestoreError(error, 'updateDepartment')
  }
}

/**
 * [Chỉ admin — enforced bởi Firestore Rules] Xóa phòng ban.
 *
 * KHÔNG tự động gỡ `departmentId` khỏi các nhân viên đang thuộc phòng ban
 * này — nhân viên đó sẽ hiển thị ở nhóm "Chưa phân bổ" trong Cơ cấu tổ
 * chức (xem `pages/NhanSuPage.jsx`) cho tới khi admin gán lại phòng ban
 * khác. Không xóa/hỏng dữ liệu hồ sơ nhân viên.
 */
export async function deleteDepartment(id) {
  const db = getDbOrThrow()

  try {
    await deleteDoc(doc(db, COLLECTION, id))
    return id
  } catch (error) {
    throw wrapFirestoreError(error, 'deleteDepartment')
  }
}
