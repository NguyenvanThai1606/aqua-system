/**
 * Tầng dữ liệu thông báo (Phase 14).
 *
 * Toàn bộ UI chỉ gọi các hàm trong file này.
 * - Firebase đã cấu hình → Cloud Firestore (realtime qua `onSnapshot`)
 * - Chưa cấu hình → localStorage + pub/sub nội bộ (development fallback)
 */

import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestoreNotificationService'
import * as localBackend from './localNotificationService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const subscribeNotifications = backend.subscribeNotifications
export const createNotification = backend.createNotification
export const markNotificationRead = backend.markNotificationRead
export const markAllNotificationsRead = backend.markAllNotificationsRead
export const deleteNotification = backend.deleteNotification
