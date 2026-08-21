/**
 * Backend công việc — localStorage + in-memory (fallback khi chưa cấu hình Firebase).
 */

import mockTasks from '../data/tasks'
import { DEFAULT_PRIORITY, DEFAULT_STATUS } from '../data/taskMeta'
import { loadCollection, saveCollection } from '../utils/collectionStorage'

const STORAGE_KEY = 'aqua:tasks'

let store = loadCollection(STORAGE_KEY, mockTasks)

function persist() {
  saveCollection(STORAGE_KEY, store)
}

function newId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function normalize(input) {
  return {
    title: input.title?.trim() ?? '',
    description: input.description?.trim() ?? '',
    status: input.status || DEFAULT_STATUS,
    priority: input.priority || DEFAULT_PRIORITY,
    assignee: input.assignee ?? null,
    deadline: input.deadline || null,
    checklist: (input.checklist ?? []).map((item) => ({
      id: item.id ?? newId('c'),
      title: item.title.trim(),
      completed: Boolean(item.completed),
    })),
  }
}

export async function listTasks() {
  return store.map((task) => structuredClone(task))
}

export async function createTask(input) {
  const task = {
    id: newId('task'),
    ...normalize(input),
    createdAt: new Date().toISOString(),
  }

  store = [task, ...store]
  persist()
  return structuredClone(task)
}

export async function updateTask(id, patch) {
  const current = store.find((task) => task.id === id)
  if (!current) throw new Error(`Không tìm thấy công việc ${id}`)

  const updated = { ...current, ...patch }
  store = store.map((task) => (task.id === id ? updated : task))
  persist()
  return structuredClone(updated)
}

export async function deleteTask(id) {
  store = store.filter((task) => task.id !== id)
  persist()
  return id
}
