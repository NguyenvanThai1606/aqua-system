/**
 * Backend sự kiện lịch — localStorage + in-memory (fallback khi chưa cấu hình Firebase).
 * Cùng phong cách với `localTaskService.js`. KHÔNG seed dữ liệu mẫu —
 * collection bắt đầu trống, đúng yêu cầu "không tạo dữ liệu mock nếu không
 * cần thiết".
 */

import { DEFAULT_SCOPE } from '../data/calendarMeta'
import { loadCollection, saveCollection } from '../utils/collectionStorage'

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

function normalize(input) {
  return {
    title: input.title?.trim() ?? '',
    date: input.date || '',
    startTime: input.startTime || '',
    endTime: input.endTime || '',
    location: input.location?.trim() ?? '',
    description: input.description?.trim() ?? '',
    participants: (input.participants ?? []).map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email ?? null,
      photoURL: person.photoURL ?? null,
      initials: person.initials ?? '?',
    })),
    participantIds: (input.participants ?? []).map((person) => person.id).filter(Boolean),
    scope: input.scope === 'company' ? 'company' : DEFAULT_SCOPE,
    ownerId: input.ownerId,
    ownerName: input.ownerName ?? '',
  }
}

export async function listEvents() {
  return store.map((event) => structuredClone(event))
}

export async function createEvent(input) {
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

  const nextParticipants = patch.participants ?? current.participants
  const updated = {
    ...current,
    ...patch,
    participants: nextParticipants,
    participantIds: nextParticipants.map((person) => person.id).filter(Boolean),
    updatedAt: new Date().toISOString(),
  }
  store = store.map((event) => (event.id === id ? updated : event))
  persist()
  return structuredClone(updated)
}

export async function deleteEvent(id) {
  store = store.filter((event) => event.id !== id)
  persist()
  return id
}
