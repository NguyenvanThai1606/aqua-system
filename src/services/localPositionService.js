/**
 * Backend danh mục CHỨC VỤ — localStorage + in-memory (fallback khi chưa
 * cấu hình Firebase). Cùng phong cách với `localDepartmentService.js`.
 */

import { loadCollection, saveCollection } from '../utils/collectionStorage'

const STORAGE_KEY = 'aqua:positions'

let store = loadCollection(STORAGE_KEY, [])

function persist() {
  saveCollection(STORAGE_KEY, store)
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pos-${crypto.randomUUID().slice(0, 8)}`
  }
  return `pos-${Math.random().toString(36).slice(2, 10)}`
}

export async function listPositions() {
  return store
    .map((position) => structuredClone({ ...position, name: typeof position.name === 'string' ? position.name : '' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

export async function createPosition(data) {
  const name = data.name?.trim() ?? ''
  if (!name) throw new Error('Tên chức vụ không được để trống.')

  const now = new Date().toISOString()
  const position = {
    id: newId(),
    name,
    createdAt: now,
  }

  store = [position, ...store]
  persist()
  return structuredClone(position)
}

export async function deletePosition(id) {
  store = store.filter((position) => position.id !== id)
  persist()
  return id
}
