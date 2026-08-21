/**
 * Backend dự án — Cloud Firestore.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { DEFAULT_PROJECT_STATUS } from '../data/projectMeta'
import { timestampToIso, toFirestorePayload, wrapFirestoreError } from './firestoreUtils'

const COLLECTION = 'projects'

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

function fromFirestore(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    createdAt: timestampToIso(data.createdAt),
  }
}

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

export async function listProjects() {
  const db = getDbOrThrow()

  try {
    // [PHASE 13 — BUG FIX] Xem chú thích chi tiết ở
    // `firestoreTaskService.listTasks()` — cùng lý do, cùng cách sửa: bỏ
    // `ensureFirestoreSeeded(db)` để KHÔNG seed 6 project mock (gán
    // `manager` là uid GIẢ `u-01`..`u-06`) vào Firestore thật, và KHÔNG
    // còn nguy cơ `listProjects()` bị `permission-denied` khi user thường
    // là người đầu tiên mở `/du-an` trên một collection `projects` trống.
    const snapshot = await getDocs(collection(db, COLLECTION))
    const projects = snapshot.docs.map(fromFirestore)

    return projects.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch (error) {
    throw wrapFirestoreError(error, 'listProjects')
  }
}

export async function getProject(id) {
  const db = getDbOrThrow()

  try {
    const snapshot = await getDoc(doc(db, COLLECTION, id))
    return snapshot.exists() ? fromFirestore(snapshot) : null
  } catch (error) {
    throw wrapFirestoreError(error, 'getProject')
  }
}

export async function createProject(data) {
  const db = getDbOrThrow()

  const project = {
    id: newId('prj'),
    ...normalize(data),
    createdAt: new Date().toISOString(),
  }

  try {
    await setDoc(doc(db, COLLECTION, project.id), toFirestorePayload(project))
    return structuredClone(project)
  } catch (error) {
    throw wrapFirestoreError(error, 'createProject')
  }
}

export async function updateProject(id, data) {
  const db = getDbOrThrow()
  const ref = doc(db, COLLECTION, id)

  try {
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) throw new Error(`Không tìm thấy dự án ${id}`)

    const current = fromFirestore(snapshot)
    const updated = { ...current, ...normalize({ ...current, ...data }) }
    await updateDoc(ref, toFirestorePayload(updated))
    return structuredClone(updated)
  } catch (error) {
    if (error.message?.startsWith('Không tìm thấy')) throw error
    throw wrapFirestoreError(error, 'updateProject')
  }
}

export async function deleteProject(id) {
  const db = getDbOrThrow()

  try {
    await deleteDoc(doc(db, COLLECTION, id))
    return id
  } catch (error) {
    throw wrapFirestoreError(error, 'deleteProject')
  }
}
