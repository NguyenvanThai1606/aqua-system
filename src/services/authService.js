/**
 * Auth core — Firebase Authentication (Email/Password).
 *
 * Dùng chung một Firebase App với Firestore (xem `src/lib/firebase.js`),
 * KHÔNG khởi tạo app thứ hai.
 *
 * Đây chỉ là tầng service (logic thuần). Không có UI ở đây.
 */

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'
import { withTimeout } from './firestoreUtils'

/** Trần thời gian chờ khi ghi displayName/photoURL sang Firebase Auth. */
const AUTH_PROFILE_TIMEOUT_MS = 15_000

function requireAuth() {
  const auth = getFirebaseAuth()
  if (!auth) {
    throw new Error(
      'Firebase chưa được cấu hình. Vui lòng điền các biến VITE_FIREBASE_* trong .env.local.',
    )
  }
  return auth
}

/**
 * Đăng nhập bằng email/password.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function signIn(email, password) {
  const auth = requireAuth()
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

/**
 * Đăng ký tài khoản mới bằng email/password.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function signUp(email, password) {
  const auth = requireAuth()
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  return user
}

/** Đăng xuất người dùng hiện tại. */
export async function signOut() {
  const auth = requireAuth()
  await firebaseSignOut(auth)
}

/**
 * Đồng bộ `displayName`/`photoURL` của Firebase Auth cho user hiện tại —
 * chỉ 2 field này (Firebase Auth `updateProfile` API vốn cũng chỉ hỗ trợ
 * đúng 2 field này, không có email/role). Dùng khi lưu trang `/profile`
 * để avatar/tên hiển thị đúng ngay, không cần đợi trang tải lại.
 *
 * Bọc `withTimeout` vì đây là một bước trong luồng lưu hồ sơ: nếu lời gọi
 * mạng không settle thì nút "Lưu thay đổi" sẽ treo ở "Đang lưu…".
 *
 * @param {{ displayName?: string, photoURL?: string | null }} patch
 */
export async function updateAuthDisplayProfile(patch) {
  const auth = requireAuth()
  if (!auth.currentUser) {
    throw new Error('Chưa đăng nhập.')
  }
  await withTimeout(
    updateProfile(auth.currentUser, patch),
    AUTH_PROFILE_TIMEOUT_MS,
    'Cập nhật tài khoản Firebase Auth',
  )
}

/**
 * Lắng nghe trạng thái đăng nhập (wrapper của `onAuthStateChanged`).
 * `callback(user)` được gọi ngay khi đăng ký và mỗi khi trạng thái đổi.
 * `user` là `null` khi chưa đăng nhập, hoặc khi Firebase chưa được cấu hình.
 *
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {() => void} hàm unsubscribe
 */
export function onAuthChange(callback) {
  const auth = getFirebaseAuth()
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

/** Người dùng hiện tại (đồng bộ) — null nếu chưa đăng nhập / chưa cấu hình. */
export function getCurrentUser() {
  const auth = getFirebaseAuth()
  return auth ? auth.currentUser : null
}

/** true khi Auth có thể dùng được (đã đủ cấu hình Firebase). */
export function isAuthReady() {
  return isFirebaseConfigured()
}
