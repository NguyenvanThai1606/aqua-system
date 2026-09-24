/**
 * Hồ sơ & vai trò người dùng — Cloud Firestore (`users` collection).
 *
 * Đây là NGUỒN SỰ THẬT DUY NHẤT cho role (admin/user):
 *  - Role không bao giờ được đọc/ghi vào localStorage/sessionStorage.
 *  - Role không được suy ra từ email hay bất kỳ giá trị hard-code nào ở frontend.
 *  - Tài khoản mới luôn được tạo với role mặc định 'user'; việc đổi thành
 *    'admin' chỉ có thể thực hiện qua `updateUserRole()` (được gọi từ trang
 *    quản trị, và bản thân request đó còn bị Firestore Security Rules chặn
 *    nếu người gọi không phải admin — xem `firestore.rules`).
 *
 * Theo đúng pattern của `firestoreProjectService.js` / `firestoreTaskService.js`
 * trong project: mọi lỗi Firestore được bọc qua `wrapFirestoreError`.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { withTimeout, wrapFirestoreError } from './firestoreUtils'

const COLLECTION = 'users'

/** Role hợp lệ duy nhất trong hệ thống. */
export const ROLES = ['user', 'admin']

/** Role mặc định cho MỌI tài khoản mới — không có ngoại lệ. */
export const DEFAULT_ROLE = 'user'

/**
 * Field nhân sự (Phase 10) — bổ sung trên CÙNG document `users/{uid}`, KHÔNG
 * tạo collection mới, KHÔNG tạo tài khoản Firebase Auth mới. Chỉ admin ghi
 * được các field này (qua `updatePersonnelProfile()` bên dưới), và CHỈ
 * đúng các field này — enforced ở `firestore.rules`, tách biệt hoàn toàn
 * với field hồ sơ cá nhân (`displayName`/`photoURL`, Phase 8-9) mà user tự
 * sửa ở `/profile`, và với `role` (chỉ đổi được qua `updateUserRole()`).
 *  - `departmentIds`: danh sách trỏ tới `departments/{departmentId}` (Phase 3).
 *  - `departmentId`/`departmentName`: field legacy, đồng bộ với phần tử đầu
 *    tiên để các client cũ vẫn hoạt động.
 */
export const PERSONNEL_EDITABLE_FIELDS = [
  'position',
  'departmentId',
  'departmentName',
  'departmentIds',
  'employmentStatus',
  'phone',
]

/** Trần thời gian chờ xác nhận một lần ghi hồ sơ (xem `withTimeout`). */
const PROFILE_WRITE_TIMEOUT_MS = 15_000

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

/** Lấy membership phòng ban, fallback an toàn cho profile schema cũ. */
export function getUserDepartmentIds(profile) {
  if (Array.isArray(profile?.departmentIds)) {
    return normalizeDepartmentIds(profile.departmentIds)
  }

  return normalizeDepartmentIds(profile?.departmentId ? [profile.departmentId] : [])
}

export function normalizeDepartmentIds(departmentIds) {
  return [...new Set(
    (Array.isArray(departmentIds) ? departmentIds : [])
      .filter((id) => typeof id === 'string' && id),
  )]
}

export function getDepartmentMembershipPatch(departmentIds, departments = [], fallbackName = null) {
  const normalizedIds = normalizeDepartmentIds(departmentIds)
  const firstId = normalizedIds[0] ?? null
  const firstDepartment = departments.find((department) => department.id === firstId)

  return {
    departmentIds: normalizedIds,
    departmentId: firstId,
    departmentName: firstDepartment?.name ?? fallbackName ?? null,
  }
}

function normalizeUserProfile(profile) {
  return {
    ...profile,
    departmentIds: getUserDepartmentIds(profile),
    permissions: Array.isArray(profile?.permissions) ? profile.permissions : [],
  }
}

/** Tên hiển thị: ưu tiên displayName Firebase, fallback phần trước "@" của email. */
export function resolveDisplayName(firebaseUser) {
  const displayName = firebaseUser?.displayName?.trim()
  if (displayName) return displayName

  const email = firebaseUser?.email ?? ''
  const [prefix] = email.split('@')
  return prefix || 'Người dùng'
}

/** Chữ cái đầu dùng làm fallback avatar — cùng thuật toán với `Avatar.jsx`. */
function initialsOf(name) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  )
}

/**
 * Chuyển một hồ sơ `users/{uid}` (từ `listUserProfiles()`) thành object
 * gọn để nhúng vào `Project.manager` / `Task.assignee`.
 *
 * `id` ở đây LUÔN LÀ Firebase Auth uid thật (chính là id của document
 * `users/{uid}`) — khác với dữ liệu cũ lấy từ `data/members.js` (id giả,
 * không có `email`). Các nơi hiển thị dùng sự vắng mặt của `email` để
 * nhận biết dữ liệu cũ — xem `isLegacyPerson()`.
 */
export function toPersonRef(profile) {
  if (!profile) return null

  const name = profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'

  return {
    id: profile.id,
    name,
    email: profile.email ?? null,
    photoURL: profile.photoURL ?? null,
    initials: initialsOf(name),
  }
}

/**
 * Dữ liệu manager/assignee cũ (tạo trước Phase 6, lấy từ `data/members.js`)
 * không có field `email` — dùng làm dấu hiệu để hiển thị chú thích
 * "dữ liệu cũ" thay vì suy đoán ánh xạ sang user thật.
 */
export function isLegacyPerson(person) {
  return Boolean(person) && !person.email
}

/**
 * Đảm bảo tồn tại hồ sơ `users/{uid}` cho tài khoản Firebase đang đăng nhập.
 *
 * - Nếu CHƯA có hồ sơ (lần đăng nhập/đăng ký đầu tiên): tạo mới với
 *   `role: 'user'` — client KHÔNG BAO GIỜ tự ghi role 'admin'.
 * - Nếu ĐÃ có hồ sơ: chỉ đồng bộ lại `email`/`displayName` nếu đổi,
 *   TUYỆT ĐỐI không đụng vào trường `role` (tránh vô tình ghi đè role
 *   admin đã được cấp trước đó).
 *
 * @param {import('firebase/auth').User} firebaseUser
 */
export async function ensureUserProfile(firebaseUser) {
  const db = getDbOrThrow()
  const ref = doc(db, COLLECTION, firebaseUser.uid)

  try {
    const snapshot = await getDoc(ref)
    const nextEmail = firebaseUser.email ?? null
    const nextDisplayName = resolveDisplayName(firebaseUser)
    const nextPhotoURL = firebaseUser.photoURL ?? null

    if (!snapshot.exists()) {
      const now = new Date().toISOString()
      const profile = {
        email: nextEmail,
        displayName: nextDisplayName,
        photoURL: nextPhotoURL,
        role: DEFAULT_ROLE,
        permissions: [],
        departmentIds: [],
        createdAt: now,
        updatedAt: now,
      }
      await setDoc(ref, profile)
      return { id: firebaseUser.uid, ...profile }
    }

    const current = snapshot.data()
    const patch = {}
    if (current.email !== nextEmail) patch.email = nextEmail
    if (current.displayName !== nextDisplayName) patch.displayName = nextDisplayName
    if (current.photoURL !== nextPhotoURL) patch.photoURL = nextPhotoURL

    if (Object.keys(patch).length > 0) {
      // Chỉ đổi updatedAt khi thực sự có thay đổi — không đụng vào `role`.
      patch.updatedAt = new Date().toISOString()
      await updateDoc(ref, patch)
    }

    return normalizeUserProfile({ id: firebaseUser.uid, ...current, ...patch })
  } catch (error) {
    throw wrapFirestoreError(error, 'ensureUserProfile')
  }
}

/**
 * Cập nhật hồ sơ CỦA CHÍNH tài khoản đang đăng nhập — dùng cho trang
 * `/profile`. CHỈ nhận `displayName`/`photoURL` — không nhận `role`,
 * `email`, `createdAt`; ngay cả nếu code gọi hàm này có lỡ truyền thêm các
 * field đó, chúng cũng bị loại khỏi payload ở đây, và Firestore Rules vẫn
 * chặn lại thêm một lớp nữa nếu payload bị sửa (xem `firestore.rules`).
 *
 * @param {string} uid
 * @param {{ displayName?: string, photoURL?: string | null }} patch
 */
export async function updateOwnProfile(uid, { displayName, photoURL } = {}) {
  const db = getDbOrThrow()

  const payload = { updatedAt: new Date().toISOString() }
  if (displayName !== undefined) payload.displayName = displayName.trim()
  if (photoURL !== undefined) payload.photoURL = photoURL?.trim() || null

  try {
    // Bọc withTimeout: khi mất mạng, `updateDoc()` xếp write vào hàng đợi
    // offline và promise không bao giờ settle → nút "Lưu thay đổi" ở
    // `/profile` treo mãi ở trạng thái "Đang lưu…". Xem `withTimeout`.
    await withTimeout(
      updateDoc(doc(db, COLLECTION, uid), payload),
      PROFILE_WRITE_TIMEOUT_MS,
      'Lưu hồ sơ vào Firestore',
    )
    return payload
  } catch (error) {
    throw wrapFirestoreError(error, 'updateOwnProfile')
  }
}

/**
 * [Chỉ admin — enforced bởi Firestore Rules] Cập nhật thông tin NHÂN SỰ
 * (chức vụ/phòng ban/trạng thái làm việc/SĐT) của MỘT NHÂN VIÊN BẤT KỲ —
 * dùng ở module Nhân sự (`pages/NhanSuPage.jsx`, Phase 10).
 *
 * CHỈ nhận đúng field trong `PERSONNEL_EDITABLE_FIELDS` — không bao giờ
 * ghi `role`/`email`/`displayName`/`photoURL`/`createdAt` qua hàm này, kể
 * cả nếu code gọi có lỡ truyền thêm. Đây KHÔNG phải hàm để user tự sửa hồ
 * sơ của chính mình (dùng `updateOwnProfile()` cho việc đó) — quyền admin
 * được xác thực lại ở `firestore.rules` (nhánh (c) của `allow update` trên
 * `users/{userId}`), trang gọi hàm này không phải lớp bảo vệ duy nhất.
 *
 * @param {string} uid
 * @param {{ position?: string|null, departmentId?: string|null, departmentName?: string|null, employmentStatus?: string|null, phone?: string|null }} patch
 */
export async function updatePersonnelProfile(uid, patch = {}) {
  const db = getDbOrThrow()

  const payload = { updatedAt: new Date().toISOString() }
  if (patch.position !== undefined) payload.position = patch.position?.trim() || null
  if (patch.departmentId !== undefined) payload.departmentId = patch.departmentId || null
  if (patch.departmentName !== undefined) payload.departmentName = patch.departmentName?.trim() || null
  if (patch.departmentIds !== undefined) {
    Object.assign(
      payload,
      getDepartmentMembershipPatch(patch.departmentIds, [], patch.departmentName?.trim() || null),
    )
  }
  if (patch.employmentStatus !== undefined) payload.employmentStatus = patch.employmentStatus || null
  if (patch.phone !== undefined) payload.phone = patch.phone?.trim() || null

  try {
    await withTimeout(
      updateDoc(doc(db, COLLECTION, uid), payload),
      PROFILE_WRITE_TIMEOUT_MS,
      'Lưu thông tin nhân sự vào Firestore',
    )
    return payload
  } catch (error) {
    throw wrapFirestoreError(error, 'updatePersonnelProfile')
  }
}

/**
 * Lắng nghe realtime hồ sơ (role) của một user theo uid — dùng để cập nhật
 * UI ngay khi admin đổi quyền, không cần đăng nhập lại.
 *
 * @param {string} uid
 * @param {(profile: {id: string, role: string, [key: string]: unknown} | null) => void} callback
 * @returns {() => void} hàm unsubscribe
 */
export function subscribeUserProfile(uid, callback) {
  const db = getDbOrThrow()
  const ref = doc(db, COLLECTION, uid)

  return onSnapshot(
    ref,
    (snapshot) => callback(
      snapshot.exists()
        ? normalizeUserProfile({ id: snapshot.id, ...snapshot.data() })
        : null,
    ),
    (error) => {
      console.error('[userService] subscribeUserProfile lỗi:', error)
      callback(null)
    },
  )
}

/**
 * Danh sách toàn bộ hồ sơ người dùng — Phase 7: mọi tài khoản đã đăng nhập
 * đều gọi được (dùng cho picker/filter "người phụ trách" trên Project/Task),
 * không còn giới hạn admin. Đổi ROLE của người khác vẫn tuyệt đối chỉ admin
 * — xem `updateUserRole()` — enforced bởi Firestore Rules (`firestore.rules`).
 */
export async function listUserProfiles() {
  const db = getDbOrThrow()

  try {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs
      .map((docSnap) => normalizeUserProfile({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''))
  } catch (error) {
    throw wrapFirestoreError(error, 'listUserProfiles')
  }
}

/**
 * [Chỉ dành cho admin — enforced bởi Firestore Rules] Đổi role của một user.
 * Việc kiểm tra "người gọi có phải admin không" nằm ở Firestore Security
 * Rules, không chỉ ở UI — xem `firestore.rules`.
 */
export async function updateUserRole(uid, role) {
  if (!ROLES.includes(role)) {
    throw new Error(`Role không hợp lệ: ${role}`)
  }

  const db = getDbOrThrow()

  try {
    await updateDoc(doc(db, COLLECTION, uid), { role })
    return { id: uid, role }
  } catch (error) {
    throw wrapFirestoreError(error, 'updateUserRole')
  }
}

/**
 * Xóa hồ sơ Firestore của user khác — quyền admin được enforce bởi Rules.
 * Firebase Auth user không bị xóa ở client; thao tác đó cần backend Admin SDK.
 */
export async function deleteUserProfile(uid) {
  if (!uid) throw new Error('Thiếu mã người dùng cần xóa.')

  const db = getDbOrThrow()

  try {
    const snapshot = await getDoc(doc(db, COLLECTION, uid))
    if (!snapshot.exists()) throw new Error(`Không tìm thấy hồ sơ người dùng ${uid}`)
    await deleteDoc(doc(db, COLLECTION, uid))
    return uid
  } catch (error) {
    if (error.message?.startsWith('Không tìm thấy hồ sơ')) throw error
    throw wrapFirestoreError(error, 'deleteUserProfile')
  }
}
