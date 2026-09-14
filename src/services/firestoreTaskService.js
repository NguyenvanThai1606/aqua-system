/**
 * Backend công việc — Cloud Firestore.
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
import { DEFAULT_PRIORITY, DEFAULT_STATUS } from '../data/taskMeta'
import { timestampToIso, toFirestorePayload, wrapFirestoreError } from './firestoreUtils'

const COLLECTION = 'tasks'

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
    notes: input.notes?.trim() ?? '',
    status: input.status || DEFAULT_STATUS,
    priority: input.priority || DEFAULT_PRIORITY,
    assignee: input.assignee ?? null,
    supervisor: input.supervisor ?? null,
    projectId: input.projectId || null,
    deadline: input.deadline || null,
    checklist: (input.checklist ?? []).map((item) => ({
      id: item.id ?? newId('c'),
      title: item.title.trim(),
      completed: Boolean(item.completed),
    })),
  }
}

function fromFirestore(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    notes: data.notes ?? '',
    supervisor: data.supervisor ?? null,
    projectId: data.projectId ?? null,
    createdAt: timestampToIso(data.createdAt),
  }
}

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

export async function listTasks() {
  const db = getDbOrThrow()

  try {
    // [PHASE 13 — BUG FIX] Trước đây gọi `ensureFirestoreSeeded(db)` ở đây,
    // tự động ghi 6 task mock (từ `data/tasks.js`, gán cho các uid GIẢ
    // `u-01`..`u-06` — xem `data/members.js`) thẳng vào Firestore THẬT nếu
    // collection `tasks` đang trống. Hai hệ quả xấu:
    //  1. Dữ liệu giả lẫn vào Firestore production — các task đó có
    //     `assignee.id` không khớp uid Firebase Auth thật nào, nên KHÔNG
    //     user thật nào tự sửa được (đúng như chú thích đã có sẵn ở
    //     `firestore.rules` về "Task cũ (assignee.id là id giả...)").
    //  2. NGHIÊM TRỌNG HƠN: `firestore.rules` chỉ cho `isAdmin()` tạo task
    //     (`allow create: if isAdmin();`), nhưng hàm seed này chạy từ PHÍA
    //     CLIENT mỗi khi bất kỳ ai gọi `listTasks()` — nếu người ĐẦU TIÊN
    //     mở `/cong-viec` trên một Firestore project vừa tạo (collection
    //     `tasks` còn trống) là user thường (không phải admin), lệnh ghi
    //     seed bị Rules từ chối (`permission-denied`), khiến TOÀN BỘ
    //     `listTasks()` ném lỗi — user không xem được danh sách công việc
    //     dù đó là một collection trống hoàn toàn hợp lệ để đọc.
    // Đã BỎ hẳn việc seed ở backend Firestore — cùng lý do và đúng tiền lệ
    // đã áp dụng cho collection `users` (xem `firestoreInit.js`). Backend
    // local (`localTaskService.js`) VẪN seed mock data bình thường —
    // KHÔNG đụng gì tới Firestore thật nên an toàn, giữ nguyên.
    const snapshot = await getDocs(collection(db, COLLECTION))
    const tasks = snapshot.docs.map(fromFirestore)

    return tasks.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch (error) {
    throw wrapFirestoreError(error, 'listTasks')
  }
}

export async function createTask(input) {
  const db = getDbOrThrow()

  const task = {
    id: newId('task'),
    ...normalize(input),
    createdAt: new Date().toISOString(),
  }

  try {
    await setDoc(doc(db, COLLECTION, task.id), toFirestorePayload(task))
    return structuredClone(task)
  } catch (error) {
    throw wrapFirestoreError(error, 'createTask')
  }
}

export async function updateTask(id, patch) {
  const db = getDbOrThrow()
  const ref = doc(db, COLLECTION, id)

  try {
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) throw new Error(`Không tìm thấy công việc ${id}`)

    const current = fromFirestore(snapshot)
    const updated = { ...current, ...patch }
    await updateDoc(ref, toFirestorePayload(updated))
    return structuredClone(updated)
  } catch (error) {
    if (error.message?.startsWith('Không tìm thấy')) throw error
    throw wrapFirestoreError(error, 'updateTask')
  }
}

export async function deleteTask(id) {
  const db = getDbOrThrow()

  try {
    await deleteDoc(doc(db, COLLECTION, id))
    return id
  } catch (error) {
    throw wrapFirestoreError(error, 'deleteTask')
  }
}
