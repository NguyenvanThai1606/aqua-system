/**
 * Backend chấm công — localStorage + in-memory (fallback khi chưa cấu hình
 * Firebase). Cùng phong cách với `localTaskService.js`. Mỗi user CHỈ có
 * đúng một bản ghi cho mỗi ngày — id dạng `${uid}_${date}`, khớp với
 * `firestoreAttendanceService.js` để hai backend hoán đổi được cho nhau
 * mà không đổi hành vi.
 */

import { loadCollection, saveCollection } from '../utils/collectionStorage'

const STORAGE_KEY = 'aqua:attendance'

let store = loadCollection(STORAGE_KEY, [])

function persist() {
  saveCollection(STORAGE_KEY, store)
}

function docId(uid, date) {
  return `${uid}_${date}`
}

export async function getAttendanceRecord(uid, date) {
  const record = store.find((item) => item.id === docId(uid, date))
  return record ? structuredClone(record) : null
}

export async function checkIn(record) {
  const id = docId(record.userId, record.date)
  if (store.some((item) => item.id === id)) {
    throw new Error('Bạn đã chấm công vào hôm nay.')
  }

  const now = new Date().toISOString()
  const created = {
    id,
    ...record,
    checkOutAt: null,
    checkOutStatus: null,
    checkOutEarlyMinutes: null,
    createdAt: now,
    updatedAt: now,
  }

  store = [created, ...store]
  persist()
  return structuredClone(created)
}

export async function checkOut(uid, date, patch) {
  const id = docId(uid, date)
  const current = store.find((item) => item.id === id)
  if (!current) throw new Error('Bạn chưa chấm công vào hôm nay.')
  if (current.checkOutAt) throw new Error('Bạn đã chấm công ra hôm nay.')

  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() }
  store = store.map((item) => (item.id === id ? updated : item))
  persist()
  return structuredClone(updated)
}

export async function listMyAttendance(uid) {
  return store
    .filter((item) => item.userId === uid)
    .map((item) => structuredClone(item))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function listAllAttendance() {
  return store.map((item) => structuredClone(item)).sort((a, b) => b.date.localeCompare(a.date))
}
