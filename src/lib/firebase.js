/**
 * Cấu hình Firebase — chỉ khởi tạo khi đủ biến môi trường Vite.
 * Không hardcode secret; dùng `.env.local` (xem `.env.example`).
 *
 * Phase 9: project CHỈ dùng Firestore + Auth (Firebase Spark, miễn phí).
 * KHÔNG khởi tạo Firebase Storage ở đây — ảnh đại diện giờ là URL người
 * dùng tự dán (xem `pages/ProfilePage.jsx`), không cần upload file nào,
 * nên không cần gói `firebase/storage` và không đòi hỏi nâng cấp Blaze.
 */

import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

/** true khi có đủ thông tin để kết nối Firestore. */
export function isFirebaseConfigured() {
  const { apiKey, projectId, appId } = readConfig()
  return Boolean(apiKey && projectId && appId)
}

let appInstance = null

/**
 * Firebase App dùng chung cho mọi service (Firestore, Auth, ...).
 * Đảm bảo chỉ có DUY NHẤT một app được khởi tạo trong toàn bộ ứng dụng.
 */
function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null

  if (!appInstance) {
    const config = readConfig()
    appInstance = getApps().length > 0 ? getApp() : initializeApp(config)
  }

  return appInstance
}

let dbInstance = null

/** Firestore instance — null nếu chưa cấu hình Firebase. */
export function getDb() {
  const app = getFirebaseApp()
  if (!app) return null

  if (!dbInstance) {
    dbInstance = getFirestore(app)
  }

  return dbInstance
}

let authInstance = null

/** Firebase Auth instance — null nếu chưa cấu hình Firebase. */
export function getFirebaseAuth() {
  const app = getFirebaseApp()
  if (!app) return null

  if (!authInstance) {
    authInstance = getAuth(app)
  }

  return authInstance
}

/** Backend đang dùng — hữu ích khi debug. */
export function getDataBackend() {
  return isFirebaseConfigured() ? 'firestore' : 'local'
}
