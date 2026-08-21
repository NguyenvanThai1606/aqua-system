/**
 * Backend dự án — localStorage + in-memory (fallback khi chưa cấu hình Firebase).
 */

import mockProjects from '../data/projects'
import { DEFAULT_PROJECT_STATUS } from '../data/projectMeta'
import { loadCollection, saveCollection } from '../utils/collectionStorage'

const STORAGE_KEY = 'aqua:projects'

let store = loadCollection(STORAGE_KEY, mockProjects)

function persist() {
  saveCollection(STORAGE_KEY, store)
}

function newId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function toAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return Math.round(amount)
}

function toProgress(value) {
  const percent = Number(value)
  if (!Number.isFinite(percent)) return 0
  return Math.min(100, Math.max(0, Math.round(percent)))
}

function normalize(input) {
  return {
    name: input.name?.trim() ?? '',
    description: input.description?.trim() ?? '',
    customer: input.customer ?? null,
    manager: input.manager ?? null,
    status: input.status || DEFAULT_PROJECT_STATUS,
    budget: toAmount(input.budget),
    spent: toAmount(input.spent),
    progress: toProgress(input.progress),
    startDate: input.startDate || null,
    deadline: input.deadline || null,
  }
}

export async function listProjects() {
  return store.map((project) => structuredClone(project))
}

export async function getProject(id) {
  const project = store.find((item) => item.id === id)
  return project ? structuredClone(project) : null
}

export async function createProject(data) {
  const project = {
    id: newId('prj'),
    ...normalize(data),
    createdAt: new Date().toISOString(),
  }

  store = [project, ...store]
  persist()
  return structuredClone(project)
}

export async function updateProject(id, data) {
  const current = store.find((project) => project.id === id)
  if (!current) throw new Error(`Không tìm thấy dự án ${id}`)

  const updated = { ...current, ...normalize({ ...current, ...data }) }
  store = store.map((project) => (project.id === id ? updated : project))
  persist()
  return structuredClone(updated)
}

export async function deleteProject(id) {
  store = store.filter((project) => project.id !== id)
  persist()
  return id
}
