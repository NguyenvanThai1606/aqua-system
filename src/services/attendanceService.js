/**
 * Tầng dữ liệu chấm công (module Chấm công — Phase 11).
 *
 * Toàn bộ UI chỉ gọi các hàm trong file này.
 * - Firebase đã cấu hình → Cloud Firestore
 * - Chưa cấu hình → localStorage (development fallback)
 */

import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestoreAttendanceService'
import * as localBackend from './localAttendanceService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const getAttendanceRecord = backend.getAttendanceRecord
export const checkIn = backend.checkIn
export const checkOut = backend.checkOut
export const listMyAttendance = backend.listMyAttendance
export const listAllAttendance = backend.listAllAttendance
