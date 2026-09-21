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
import { sendNotificationEmail } from './notificationEmailService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const subscribeNotifications = backend.subscribeNotifications
export const getNotificationsByUser = backend.getNotificationsByUser
export const markNotificationAsRead = backend.markNotificationAsRead
export const markAllNotificationsAsRead = backend.markAllNotificationsAsRead
export const deleteNotification = backend.deleteNotification

function sendEmailSideEffect(notification) {
	if (!isFirebaseConfigured()) return
	sendNotificationEmail(notification).catch((error) => {
		console.warn('[notificationService] Email side effect failed:', error.message)
	})
}

export async function createNotification(input) {
	const notification = await backend.createNotification(input)
	sendEmailSideEffect(notification)
	return notification
}

export async function createNotifications(inputs) {
	const notifications = await backend.createNotifications(inputs)
	notifications.forEach(sendEmailSideEffect)
	return notifications
}

export const markNotificationRead = markNotificationAsRead
export const markAllNotificationsRead = markAllNotificationsAsRead
