/**
 * Backend sự kiện lịch — localStorage + in-memory (fallback khi chưa cấu hình Firebase).
 * Cùng phong cách với `localTaskService.js`. KHÔNG seed dữ liệu mẫu —
 * collection bắt đầu trống, đúng yêu cầu "không tạo dữ liệu mock nếu không
 * cần thiết".
 */

import { DEFAULT_SCOPE } from '../data/calendarMeta'
import { loadCollection, saveCollection } from '../utils/collectionStorage'
import { isValidIsoDate, isValidTimeRange } from '../utils/calendarUtils'

const STORAGE_KEY = 'aqua:events'

let store = loadCollection(STORAGE_KEY, [])

function persist() {
  saveCollection(STORAGE_KEY, store)
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `evt-${crypto.randomUUID().slice(0, 8)}`
  }
  return `evt-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeParticipants(participants) {
  const seen = new Set()

  return (Array.isArray(participants) ? participants : [])
    .filter((person) => person?.id && !seen.has(person.id) && seen.add(person.id))
    .map((person) => ({
      id: person.id,
      name: person.name ?? 'Người dùng',
      email: person.email ?? null,
      photoURL: person.photoURL ?? null,
      initials: person.initials ?? '?',
    }))
}

function normalize(input) {
  const participants = normalizeParticipants(input.participants)

  return {
    title: input.title?.trim() ?? '',
    date: input.date || '',
    startTime: input.startTime || '',
    endTime: input.endTime || '',
    location: input.location?.trim() ?? '',
    description: input.description?.trim() ?? '',
    participants,
    participantIds: participants.map((person) => person.id),
    scope: input.scope === 'company' ? 'company' : DEFAULT_SCOPE,
    ownerId: input.ownerId,
    ownerName: input.ownerName ?? '',
  }
}

function normalizeStoredEvent(event) {
  const normalized = normalize(event)
  return { ...normalized, id: event.id, createdAt: event.createdAt, updatedAt: event.updatedAt }
}

function validateEvent(input) {
  if (!input.title?.trim()) throw new Error('Tiêu đề sự kiện không được để trống.')
  if (!isValidIsoDate(input.date)) throw new Error('Ngày sự kiện không hợp lệ.')
  if (!isValidTimeRange(input.startTime ?? '', input.endTime ?? '')) {
    throw new Error('Giờ kết thúc phải sau hoặc bằng giờ bắt đầu.')
  }
}

export async function listEvents() {
  return store.map((event) => structuredClone(normalizeStoredEvent(event)))
}

export async function createEvent(input) {
  validateEvent(input)
  const now = new Date().toISOString()
  const event = {
    id: newId(),
    ...normalize(input),
    createdAt: now,
    updatedAt: now,
  }

  store = [event, ...store]
  persist()
  return structuredClone(event)
}

export async function updateEvent(id, patch) {
  const current = store.find((event) => event.id === id)
  if (!current) throw new Error(`Không tìm thấy sự kiện ${id}`)

  const normalizedCurrent = normalizeStoredEvent(current)
  const updated = {
    ...normalizedCurrent,
    ...normalize({ ...normalizedCurrent, ...patch }),
    updatedAt: new Date().toISOString(),
  }
  validateEvent(updated)
  store = store.map((event) => (event.id === id ? updated : event))
  persist()
  return structuredClone(updated)
}

export async function deleteEvent(id) {
  store = store.filter((event) => event.id !== id)
  persist()
  return id
}
