/**
 * Tầng dữ liệu danh mục CHỨC VỤ (Phase 15).
 *
 * Toàn bộ UI chỉ gọi các hàm trong file này.
 * - Firebase đã cấu hình → Cloud Firestore
 * - Chưa cấu hình → localStorage (development fallback)
 *
 * Cùng đúng kiến trúc dual-backend dùng chung ở mọi module khác (xem
 * `departmentService.js`/`projectService.js`/`eventService.js`).
 */

import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestorePositionService'
import * as localBackend from './localPositionService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const listPositions = backend.listPositions
export const createPosition = backend.createPosition
export const deletePosition = backend.deletePosition
