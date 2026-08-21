/**
 * Khởi tạo dữ liệu Firestore lần đầu (collection trống).
 * Chỉ seed từ mock data — KHÔNG đọc localStorage để tránh ghi đè Firestore.
 *
 * [PHASE 13 AUDIT — FILE KHÔNG CÒN ĐƯỢC GỌI] `ensureFirestoreSeeded()` đã
 * bị BỎ khỏi `firestoreTaskService.listTasks()` và
 * `firestoreProjectService.listProjects()` (xem chú thích ở 2 file đó) vì
 * đây là bug thật: hàm này tự động ghi mock task/project — gán cho các uid
 * GIẢ `u-01`..`u-06` từ `data/members.js` — thẳng vào Firestore THẬT bất cứ
 * khi nào có người (kể cả user thường) là người đầu tiên gọi
 * `listTasks()`/`listProjects()` trên một collection còn trống, và vì
 * `firestore.rules` chỉ cho `isAdmin()` tạo document ở 2 collection này,
 * lệnh ghi seed đó còn có thể khiến CHÍNH LỆNH ĐỌC (`listTasks`/
 * `listProjects`) bị `permission-denied` khi người gọi không phải admin.
 * File này được GIỮ LẠI (không xóa) vì có thể vẫn hữu ích để seed dữ liệu
 * demo cho một Firestore project MỚI/staging một cách CÓ CHỦ ĐÍCH (gọi tay
 * từ script/console, không tự động chạy từ client nữa) — nhưng hiện KHÔNG
 * còn được import ở bất kỳ đâu trong runtime. An toàn để xóa nếu xác nhận
 * không cần seed demo project/task nữa.
 *
 * LƯU Ý (phát hiện khi audit Phase 8): trước đây file này còn seed cả
 * collection `users` bằng 6 "member" giả từ `data/members.js` (id dạng
 * `u-01`…`u-06`, schema {name, initials, role: <chức danh>, ...}) — ĐỤNG
 * TÊN với collection `users/{uid}` thật do Firebase Auth + `userService.js`
 * quản lý từ Phase 4 trở đi (schema {email, displayName, photoURL, role:
 * 'admin'|'user', createdAt, updatedAt}). Hai schema hoàn toàn khác nhau
 * dùng chung 1 collection có thể khiến `listUserProfiles()` (dùng ở
 * AdminUsersPage, các picker/filter Phase 6-7) trả về rác trộn lẫn user
 * thật. Đã BỎ việc seed users ở đây — `users/{uid}` giờ CHỈ được tạo qua
 * `ensureUserProfile()` khi có tài khoản Firebase Auth thật đăng nhập.
 * Nếu Firestore hiện tại đã lỡ có sẵn các document `u-01`…`u-06` từ trước
 * (do hàm cũ từng chạy khi `users` còn trống), hãy tự xóa tay các document
 * đó trong Firebase Console — an toàn vì chúng không phải tài khoản thật,
 * không đụng đến bất kỳ user/role thật nào.
 *
 * [PHASE 13] Cùng cách xử lý y hệt áp dụng cho `tasks`/`projects`: nếu
 * Firestore thật đã lỡ có sẵn document `task-001`…, `prj-xxx` với
 * `assignee`/`manager` là uid giả `u-01`..`u-06` (do hàm seed cũ từng chạy
 * trước khi bị gỡ ở Phase 13 này), đó KHÔNG phải dữ liệu thật — an toàn để
 * tự xóa tay trong Firebase Console nếu muốn dọn sạch, nhưng KHÔNG bắt
 * buộc (chúng không gây lỗi, chỉ đơn giản là user thường không tự sửa
 * được cho tới khi admin gán lại người phụ trách thật).
 */

import {
  collection,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import mockTasks from '../data/tasks'
import mockProjects from '../data/projects'
import { toFirestorePayload } from './firestoreUtils'

let initPromise = null

async function seedIfEmpty(db, collectionName, records) {
  const colRef = collection(db, collectionName)
  const snapshot = await getDocs(colRef)
  if (!snapshot.empty) return

  const batch = writeBatch(db)
  records.forEach((record) => {
    batch.set(doc(db, collectionName, record.id), toFirestorePayload(record))
  })
  await batch.commit()
}

/** Seed tasks, projects nếu collection còn trống. Chỉ chạy một lần. */
export function ensureFirestoreSeeded(db) {
  if (!initPromise) {
    initPromise = (async () => {
      await Promise.all([
        seedIfEmpty(db, 'tasks', mockTasks),
        seedIfEmpty(db, 'projects', mockProjects),
      ])
    })().catch((error) => {
      initPromise = null
      throw error
    })
  }

  return initPromise
}
