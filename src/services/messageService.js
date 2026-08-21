/**
 * Tầng dữ liệu tin nhắn (module Tin nhắn — Phase 12).
 *
 * Toàn bộ UI chỉ gọi các hàm trong file này.
 * - Firebase đã cấu hình → Cloud Firestore (realtime qua `onSnapshot`)
 * - Chưa cấu hình → localStorage + pub/sub nội bộ (development fallback)
 */

import { isFirebaseConfigured } from '../lib/firebase'
import * as firestoreBackend from './firestoreMessageService'
import * as localBackend from './localMessageService'

const backend = isFirebaseConfigured() ? firestoreBackend : localBackend

export const subscribeConversations = backend.subscribeConversations
export const subscribeMessages = backend.subscribeMessages
export const getOrCreateDirectConversation = backend.getOrCreateDirectConversation
export const sendMessage = backend.sendMessage
export const markConversationRead = backend.markConversationRead

// Chat nhóm (Phase 12.x) — xem `firestoreMessageService.js`/`localMessageService.js`.
export const createGroupConversation = backend.createGroupConversation
export const updateGroupConversation = backend.updateGroupConversation
export const addGroupParticipants = backend.addGroupParticipants
export const removeGroupParticipant = backend.removeGroupParticipant
