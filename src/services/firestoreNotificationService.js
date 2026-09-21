/**
 * Backend THÔNG BÁO — Cloud Firestore (`notifications` collection, Phase 14).
 *
 * Mỗi document là MỘT thông báo gửi cho ĐÚNG MỘT người nhận (`userId`).
 * KHÔNG có khái niệm "thông báo chung" — mọi loại thông báo hiện có
 * (`task_assigned`, `task_updated`, `project_manager_assigned`,
 * `group_added`) đều được ghi riêng cho từng người nhận, không denormalize
 * broadcast list nào cả — khớp field `userId` đơn, dễ audit ai nhận được gì.
 *
 * Đọc/ghi bị giới hạn CHỈ chủ sở hữu (`userId == request.auth.uid`) — kể cả
 * admin cũng KHÔNG đọc được thông báo của người khác (xem `firestore.rules`,
 * cùng nguyên tắc riêng tư đã áp dụng cho `conversations`/`attendance`).
 *
 * Tạo (`create`) chỉ hợp lệ khi người gọi CHÍNH LÀ actor được phép sinh ra
 * loại thông báo đó — hiện tại cả 4 loại đều chỉ phát sinh từ hành động của
 * admin (giao/sửa task, chỉ định quản lý dự án, thêm thành viên nhóm — tất
 * cả đều đã yêu cầu `isAdmin()` ở rules của chính collection gốc), nên rule
 * `notifications` CHỈ cho `isAdmin()` tạo, và `actorId` bắt buộc bằng chính
 * `request.auth.uid` — không giả mạo được người gửi.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { timestampToIso } from './firestoreUtils'

const COLLECTION = 'notifications'

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

function fromSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    userId: data.userId ?? null,
    type: data.type ?? 'unknown',
    title: data.title ?? 'Thông báo',
    message: data.message ?? '',
    read: data.read === true,
    relatedType: data.relatedType ?? null,
    relatedId: data.relatedId ?? null,
    actorId: data.actorId ?? null,
    createdAt: timestampToIso(data.createdAt),
  }
}

function normalizeNotification(input, id, createdAt = new Date().toISOString()) {
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
    createdAt,
  }
}

/**
 * Realtime danh sách thông báo của `uid` — KHÔNG dùng `orderBy` kèm `where`
 * trong cùng query để tránh bắt buộc composite index thủ công trên Firebase
 * Console (cùng lý do đã áp dụng ở `firestoreMessageService.subscribeConversations`);
 * sắp xếp theo `createdAt` (mới nhất trước) được làm ở client.
 *
 * @returns {() => void} hàm unsubscribe
 */
export function subscribeNotifications(uid, callback, onError) {
  const db = getDbOrThrow()
  const q = query(collection(db, COLLECTION), where('userId', '==', uid))

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map(fromSnapshot)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      callback(list)
    },
    (error) => {
      console.error('[firestoreNotificationService] subscribeNotifications lỗi:', error)
      callback([])
      onError?.(error)
    },
  )
}

/**
 * Tạo một thông báo mới — CHỈ admin gọi được (enforced ở `firestore.rules`,
 * xem chú thích đầu file). `actorId` LUÔN là uid của người đang gọi hàm này
 * (người thực hiện hành động gây ra thông báo — vd. admin giao việc),
 * KHÔNG PHẢI người nhận.
 */
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
  const db = getDbOrThrow()
  const id = `notif-${doc(collection(db, COLLECTION)).id}`
  const notification = normalizeNotification(
    { userId, type, title, message, relatedType, relatedId, actorId, actorName },
    id,
  )

  await setDoc(doc(db, COLLECTION, id), notification)
  return { id, ...notification }
}

export async function createNotifications(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) return []

  const db = getDbOrThrow()
  const batch = writeBatch(db)
  const notifications = inputs.map((input) => {
    const id = `notif-${doc(collection(db, COLLECTION)).id}`
    const notification = normalizeNotification(input, id)
    batch.set(doc(db, COLLECTION, id), notification)
    return notification
  })

  await batch.commit()
  return notifications.map((notification) => structuredClone(notification))
}

export async function getNotificationsByUser(uid) {
  const db = getDbOrThrow()
  const snapshot = await getDocs(query(collection(db, COLLECTION), where('userId', '==', uid)))
  return snapshot.docs
    .map(fromSnapshot)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

/** Đánh dấu MỘT thông báo đã đọc — CHỈ chủ sở hữu (enforced ở rules). */
export async function markNotificationAsRead(id) {
  const db = getDbOrThrow()
  await updateDoc(doc(db, COLLECTION, id), { read: true })
}

/** Đánh dấu NHIỀU thông báo đã đọc cùng lúc — dùng cho "Đánh dấu tất cả đã đọc". */
export async function markAllNotificationsAsRead(ids) {
  if (!ids || ids.length === 0) return

  const db = getDbOrThrow()
  const batch = writeBatch(db)
  ids.forEach((id) => batch.update(doc(db, COLLECTION, id), { read: true }))
  await batch.commit()
}

export const markNotificationRead = markNotificationAsRead
export const markAllNotificationsRead = markAllNotificationsAsRead

/** Xóa MỘT thông báo — CHỈ chủ sở hữu (enforced ở rules). */
export async function deleteNotification(id) {
  const db = getDbOrThrow()
  await deleteDoc(doc(db, COLLECTION, id))
}
