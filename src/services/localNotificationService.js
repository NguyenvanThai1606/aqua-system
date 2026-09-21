/**
 * Backend THÔNG BÁO — localStorage + in-memory (fallback khi chưa cấu hình
 * Firebase). Cùng phong cách với `localMessageService.js`. KHÔNG seed dữ
 * liệu mẫu — collection bắt đầu trống.
 *
 * "Realtime" giả lập bằng pub/sub nội bộ trong cùng tab — xem chú thích chi
 * tiết ở đầu `localMessageService.js` (cùng giới hạn: không đồng bộ giữa
 * nhiều tab trình duyệt).
 */

import { loadCollection, saveCollection } from '../utils/collectionStorage'

const STORAGE_KEY = 'aqua:notifications'

let notifications = loadCollection(STORAGE_KEY, [])

/** uid -> Set<callback(list)> */
const listeners = new Map()

function persist() {
  saveCollection(STORAGE_KEY, notifications)
}

function notificationsFor(uid) {
  return notifications
    .filter((notification) => notification.userId === uid)
    .map((notification) => structuredClone(notification))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

function emit(uid) {
  listeners.get(uid)?.forEach((callback) => callback(notificationsFor(uid)))
}

export function subscribeNotifications(uid, callback, _onError) {
  if (!listeners.has(uid)) listeners.set(uid, new Set())
  listeners.get(uid).add(callback)
  callback(notificationsFor(uid))

  return () => {
    listeners.get(uid)?.delete(callback)
  }
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `notif-${crypto.randomUUID().slice(0, 8)}`
  }
  return `notif-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeNotification(input, id = newId()) {
  if (!input?.userId) throw new Error('Thiếu người nhận thông báo (userId).')
  if (!input?.type) throw new Error('Thiếu loại thông báo (type).')

  return {
    id,
    userId: input.userId,
    type: input.type,
    title: input.title ?? '',
    message: input.message ?? '',
    read: false,
    relatedType: input.relatedType ?? null,
    relatedId: input.relatedId ?? null,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    createdAt: new Date().toISOString(),
  }
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  relatedType = null,
  relatedId = null,
  actorId = null,
  actorName = null,
}) {
  const notification = normalizeNotification({
    userId,
    type,
    title,
    message,
    relatedType,
    relatedId,
    actorId,
    actorName,
  })

  notifications = [notification, ...notifications]
  persist()
  emit(userId)
  return structuredClone(notification)
}

export async function createNotifications(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) return []

  const created = inputs.map((input) => normalizeNotification(input))
  notifications = [...created.reverse(), ...notifications]
  persist()
  new Set(created.map((notification) => notification.userId)).forEach(emit)
  return created.map((notification) => structuredClone(notification))
}

export async function getNotificationsByUser(uid) {
  return notificationsFor(uid)
}

export async function markNotificationAsRead(id) {
  const target = notifications.find((notification) => notification.id === id)
  if (!target) return

  notifications = notifications.map((notification) =>
    notification.id === id ? { ...notification, read: true } : notification,
  )
  persist()
  emit(target.userId)
}

export async function markAllNotificationsAsRead(ids) {
  if (!ids || ids.length === 0) return

  const idSet = new Set(ids)
  const affectedUids = new Set(
    notifications.filter((notification) => idSet.has(notification.id)).map((notification) => notification.userId),
  )

  notifications = notifications.map((notification) =>
    idSet.has(notification.id) ? { ...notification, read: true } : notification,
  )
  persist()
  affectedUids.forEach((uid) => emit(uid))
}

export const markNotificationRead = markNotificationAsRead
export const markAllNotificationsRead = markAllNotificationsAsRead

export async function deleteNotification(id) {
  const target = notifications.find((notification) => notification.id === id)
  if (!target) return

  notifications = notifications.filter((notification) => notification.id !== id)
  persist()
  emit(target.userId)
}
