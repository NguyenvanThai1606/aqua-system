/**
 * Tầng dữ liệu công việc.
 *
 * Toàn bộ UI chỉ gọi các hàm trong file này.
 * - Firebase đã cấu hình → Cloud Firestore
 * - Chưa cấu hình → localStorage (development fallback)
 */

import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestoreTaskService'
import * as localBackend from './localTaskService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const listTasks = backend.listTasks
export const createTask = backend.createTask
export const updateTask = backend.updateTask
export const deleteTask = backend.deleteTask

/** Backend hiện tại — 'firestore' | 'local'. */
export function getTaskBackend() {
  return isFirebaseConfigured() ? 'firestore' : 'local'
}
