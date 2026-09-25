import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { timestampToIso, toFirestorePayload, wrapFirestoreError } from './firestoreUtils'

const COLLECTION = 'timesheetAdjustments'

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `tsa-${crypto.randomUUID().slice(0, 8)}`
  }
  return `tsa-${Math.random().toString(36).slice(2, 10)}`
}

function normalize(input, id, createdBy, timestamps = {}) {
  const amount = Number(input.amount)
  if (!input.userId) throw new Error('Người nhận là bắt buộc.')
  if (!['addition', 'deduction'].includes(input.type)) throw new Error('Loại điều chỉnh không hợp lệ.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền phải lớn hơn 0.')
  if (!input.description?.trim()) throw new Error('Nội dung là bắt buộc.')
  if (!input.date) throw new Error('Ngày là bắt buộc.')

  return {
    id,
    userId: input.userId,
    userName: input.userName ?? '',
    type: input.type,
    amount: Math.round(amount),
    description: input.description.trim(),
    date: input.date,
    note: input.note?.trim() ?? '',
    createdBy,
    createdAt: timestamps.createdAt ?? new Date().toISOString(),
    updatedAt: timestamps.updatedAt ?? new Date().toISOString(),
  }
}

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

function fromSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    amount: Number(data.amount) || 0,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt ?? data.createdAt),
  }
}

export async function listAdjustments() {
  const db = getDbOrThrow()
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('date', 'desc')))
    return snapshot.docs.map(fromSnapshot)
  } catch (error) {
    throw wrapFirestoreError(error, 'listTimesheetAdjustments')
  }
}

export async function createAdjustment(input, currentUser) {
  const db = getDbOrThrow()
  if (!currentUser?.uid) throw new Error('Chưa xác định người dùng đang đăng nhập.')
  const now = new Date().toISOString()
  const adjustment = normalize(input, newId(), currentUser.uid, { createdAt: now, updatedAt: now })
  try {
    await setDoc(doc(db, COLLECTION, adjustment.id), toFirestorePayload(adjustment))
    return structuredClone(adjustment)
  } catch (error) {
    throw wrapFirestoreError(error, 'createTimesheetAdjustment')
  }
}

export async function updateAdjustment(id, input) {
  const db = getDbOrThrow()
  const ref = doc(db, COLLECTION, id)
  try {
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) throw new Error(`Không tìm thấy khoản điều chỉnh ${id}`)
    const current = fromSnapshot(snapshot)
    const updated = normalize({ ...current, ...input }, id, current.createdBy, {
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    })
    await updateDoc(ref, toFirestorePayload(updated))
    return structuredClone(updated)
  } catch (error) {
    if (error.message?.startsWith('Không tìm thấy')) throw error
    throw wrapFirestoreError(error, 'updateTimesheetAdjustment')
  }
}

export async function deleteAdjustment(id) {
  const db = getDbOrThrow()
  try {
    await deleteDoc(doc(db, COLLECTION, id))
    return id
  } catch (error) {
    throw wrapFirestoreError(error, 'deleteTimesheetAdjustment')
  }
}