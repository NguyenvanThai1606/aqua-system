/**
 * Cấu hình Firebase — chỉ khởi tạo khi đủ biến môi trường Vite.
 *
 * Không hardcode secret; dùng .env.local.
 *
 * Project sử dụng:
 * - Firebase Authentication
 * - Cloud Firestore
 *
 * Không sử dụng Firebase Storage.
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

/**
 * Kiểm tra Firebase đã được cấu hình đầy đủ hay chưa.
 */
export function isFirebaseConfigured() {
  const {
    apiKey,
    authDomain,
    projectId,
    messagingSenderId,
    appId,
  } = readConfig()

  return Boolean(
    apiKey &&
    authDomain &&
    projectId &&
    messagingSenderId &&
    appId
  )
}

let appInstance = null

/**
 * Lấy Firebase App dùng chung cho toàn bộ ứng dụng.
 */
function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    return null
  }

  if (!appInstance) {
    const config = readConfig()

    appInstance =
      getApps().length > 0
        ? getApp()
        : initializeApp(config)
  }

  return appInstance
}

let dbInstance = null

/**
 * Lấy Firestore instance.
 *
 * Trả về null nếu Firebase chưa được cấu hình.
 */
export function getDb() {
  const app = getFirebaseApp()

  if (!app) {
    return null
  }

  if (!dbInstance) {
    dbInstance = getFirestore(app)
  }

  return dbInstance
}

let authInstance = null

/**
 * Lấy Firebase Authentication instance.
 *
 * Trả về null nếu Firebase chưa được cấu hình.
 */
export function getFirebaseAuth() {
  const app = getFirebaseApp()

  if (!app) {
    return null
  }

  if (!authInstance) {
    authInstance = getAuth(app)
  }

  return authInstance
}

/**
 * Backend hiện tại của ứng dụng.
 */
export function getDataBackend() {
  return isFirebaseConfigured()
    ? 'firestore'
    : 'local'
}
