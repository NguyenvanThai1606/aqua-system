/**
 * Tầng dữ liệu dự án.
 *
 * Toàn bộ UI chỉ gọi các hàm trong file này.
 * - Firebase đã cấu hình → Cloud Firestore
 * - Chưa cấu hình → localStorage (development fallback)
 */

import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestoreProjectService'
import * as localBackend from './localProjectService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const listProjects = backend.listProjects
export const getProject = backend.getProject
export const createProject = backend.createProject
export const updateProject = backend.updateProject
export const deleteProject = backend.deleteProject

/** Backend hiện tại — 'firestore' | 'local'. */
export function getProjectBackend() {
  return isFirebaseConfigured() ? 'firestore' : 'local'
}
