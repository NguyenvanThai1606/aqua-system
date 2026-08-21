/**
 * Backend chấm công — Cloud Firestore (`attendance` collection, Phase 11).
 *
 * Mỗi user CHỈ có đúng MỘT document cho mỗi ngày, id = `${uid}_${date}` —
 * vừa đảm bảo không chấm công trùng, vừa cho phép `firestore.rules` kiểm
 * tra danh tính người ghi bằng CHÍNH id tài liệu (`attendanceId ==
 * request.auth.uid + '_' + request.resource.data.date`) mà không cần đọc
 * thêm dữ liệu nào khác.
 *
 * Đọc/ghi bị giới hạn chặt hơn `events`/`tasks`/`projects` — đây là dữ
 * liệu giờ vào/ra CỦA TỪNG CÁ NHÂN, không phải thông tin phối hợp công
 * việc chung:
 *  - User chỉ đọc/ghi được bản ghi CỦA CHÍNH MÌNH.
 *  - Admin đọc được TOÀN BỘ (phục vụ bảng chấm công + bộ lọc theo nhân
 *    viên/ngày/trạng thái), nhưng KHÔNG ghi/sửa hộ nhân viên — "quản lý"
 *    ở đây được hiểu là xem/lọc/tổng hợp, không phải chỉnh sửa giờ chấm
 *    công thay người khác (tránh mở quyền quá mức so với yêu cầu Phase 11).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { timestampToIso, toFirestorePayload, wrapFirestoreError } from './firestoreUtils'

const COLLECTION = 'attendance'

function docId(uid, date) {
  return `${uid}_${date}`
}

function fromFirestore(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt ?? data.createdAt),
  }
}

function getDbOrThrow() {
  const db = getDb()
  if (!db) throw new Error('Firestore chưa được cấu hình.')
  return db
}

export async function getAttendanceRecord(uid, date) {
  const db = getDbOrThrow()

  try {
    const snapshot = await getDoc(doc(db, COLLECTION, docId(uid, date)))
    return snapshot.exists() ? fromFirestore(snapshot) : null
  } catch (error) {
    throw wrapFirestoreError(error, 'getAttendanceRecord')
  }
}

/**
 * Tạo bản ghi CHẤM CÔNG VÀO của ngày hôm nay — thất bại nếu đã tồn tại
 * (chặn chấm công vào 2 lần/ngày). `record` do `AttendancePage` chuẩn bị
 * sẵn (đã tính `checkInStatus`/`lateMinutes`/khung giờ áp dụng).
 */
export async function checkIn(record) {
  const db = getDbOrThrow()
  const id = docId(record.userId, record.date)
  const ref = doc(db, COLLECTION, id)

  try {
    const existing = await getDoc(ref)
    if (existing.exists()) throw new Error('Bạn đã chấm công vào hôm nay.')

    const now = new Date().toISOString()
    const payload = {
      id,
      ...record,
      checkOutAt: null,
      checkOutStatus: null,
      checkOutEarlyMinutes: null,
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(ref, toFirestorePayload(payload))
    return structuredClone(payload)
  } catch (error) {
    if (error.message?.startsWith('Bạn')) throw error
    throw wrapFirestoreError(error, 'checkIn')
  }
}

/** Cập nhật bản ghi hiện có với giờ CHẤM CÔNG RA — thất bại nếu chưa check-in hoặc đã check-out. */
export async function checkOut(uid, date, patch) {
  const db = getDbOrThrow()
  const ref = doc(db, COLLECTION, docId(uid, date))

  try {
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) throw new Error('Bạn chưa chấm công vào hôm nay.')

    const current = fromFirestore(snapshot)
    if (current.checkOutAt) throw new Error('Bạn đã chấm công ra hôm nay.')

    const payload = { ...patch, updatedAt: new Date().toISOString() }
    await updateDoc(ref, payload)
    return { ...current, ...payload }
  } catch (error) {
    if (error.message?.startsWith('Bạn')) throw error
    throw wrapFirestoreError(error, 'checkOut')
  }
}

export async function listMyAttendance(uid) {
  const db = getDbOrThrow()

  try {
    const snapshot = await getDocs(query(collection(db, COLLECTION), where('userId', '==', uid)))
    return snapshot.docs.map(fromFirestore).sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    throw wrapFirestoreError(error, 'listMyAttendance')
  }
}

/** [Chỉ admin — enforced bởi Firestore Rules] Toàn bộ bản ghi chấm công. */
export async function listAllAttendance() {
  const db = getDbOrThrow()

  try {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map(fromFirestore).sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    throw wrapFirestoreError(error, 'listAllAttendance')
  }
}
