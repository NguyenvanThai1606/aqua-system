/**
 * Tầng dữ liệu phòng ban.
 *
 * Toàn bộ UI chỉ gọi các hàm trong file này.
 * - Firebase đã cấu hình → Cloud Firestore
 * - Chưa cấu hình → localStorage (development fallback)
 *
 * [Phase 13 audit] Thêm dispatcher này để khớp đúng kiến trúc dual-backend
 * dùng chung ở mọi module khác (xem `projectService.js`/`taskService.js`/
 * `eventService.js`/`attendanceService.js`/`messageService.js`) — trước đó
 * `departments` là module DUY NHẤT import thẳng `firestoreDepartmentService`,
 * bỏ qua local fallback. Khi Firebase đã cấu hình (trường hợp thật của app),
 * hành vi hoàn toàn không đổi — vẫn dùng đúng `firestoreDepartmentService`.
 */

import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestoreDepartmentService'
import * as localBackend from './localDepartmentService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const listDepartments = backend.listDepartments
export const createDepartment = backend.createDepartment
export const updateDepartment = backend.updateDepartment
export const deleteDepartment = backend.deleteDepartment

/** Backend hiện tại — 'firestore' | 'local'. */
export function getDepartmentBackend() {
  return isFirebaseConfigured() ? 'firestore' : 'local'
}
