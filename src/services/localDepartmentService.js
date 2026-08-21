/**
 * Backend phòng ban — localStorage + in-memory (fallback khi chưa cấu hình
 * Firebase). Cùng phong cách với `localProjectService.js`/`localTaskService.js`.
 *
 * [Phase 13 audit] File này trước đây KHÔNG tồn tại — `useDepartments.js`
 * và `NhanSuPage.jsx` import THẲNG `firestoreDepartmentService.js`, khác
 * với MỌI module khác (projects/tasks/events/attendance/messages) vốn đều
 * đi qua một dispatcher `xService.js` chọn giữa `firestoreXService`/
 * `localXService` theo `isFirebaseConfigured()`. Bổ sung file này +
 * `departmentService.js` để khớp lại đúng kiến trúc dual-backend đã thiết
 * lập từ Phase 5 — KHÔNG đổi hành vi khi đã cấu hình Firebase (backend
 * Firestore vẫn được chọn y hệt trước đây).
 */

import { loadCollection, saveCollection } from '../utils/collectionStorage'

const STORAGE_KEY = 'aqua:departments'

let store = loadCollection(STORAGE_KEY, [])

function persist() {
  saveCollection(STORAGE_KEY, store)
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `dept-${crypto.randomUUID().slice(0, 8)}`
  }
  return `dept-${Math.random().toString(36).slice(2, 10)}`
}

function normalize(input) {
  return {
    name: input.name?.trim() ?? '',
    description: input.description?.trim() ?? '',
    managerId: input.managerId || null,
    managerName: input.managerName?.trim() || null,
  }
}

export async function listDepartments() {
  return store
    .map((department) => structuredClone(department))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

export async function createDepartment(data) {
  const now = new Date().toISOString()
  const department = {
    id: newId(),
    ...normalize(data),
    createdAt: now,
    updatedAt: now,
  }

  store = [department, ...store]
  persist()
  return structuredClone(department)
}

export async function updateDepartment(id, data) {
  const current = store.find((department) => department.id === id)
  if (!current) throw new Error(`Không tìm thấy phòng ban ${id}`)

  const updated = {
    ...current,
    ...normalize({ ...current, ...data }),
    updatedAt: new Date().toISOString(),
  }
  store = store.map((department) => (department.id === id ? updated : department))
  persist()
  return structuredClone(updated)
}

/**
 * KHÔNG tự động gỡ `departmentId` khỏi các nhân viên đang thuộc phòng ban
 * này — khớp đúng hành vi của `firestoreDepartmentService.deleteDepartment()`
 * (nhân viên rơi vào nhóm "Chưa phân bổ" cho tới khi admin gán lại).
 */
export async function deleteDepartment(id) {
  store = store.filter((department) => department.id !== id)
  persist()
  return id
}
