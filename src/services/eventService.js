/**
 * Tầng dữ liệu sự kiện lịch (module Lịch — Phase 11).
 *
 * Toàn bộ UI chỉ gọi các hàm trong file này.
 * - Firebase đã cấu hình → Cloud Firestore
 * - Chưa cấu hình → localStorage (development fallback)
 */

import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestoreEventService'
import * as localBackend from './localEventService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const listEvents = backend.listEvents
export const createEvent = backend.createEvent
export const updateEvent = backend.updateEvent
export const deleteEvent = backend.deleteEvent
