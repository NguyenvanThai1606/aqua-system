import { loadCollection, saveCollection } from '../utils/collectionStorage'

const STORAGE_KEY = 'aqua:timesheetAdjustments'
let store = loadCollection(STORAGE_KEY, [])

function persist() {
  saveCollection(STORAGE_KEY, store)
}

function newId() {
  return `tsa-${crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`
}

function normalize(input, id, createdBy, current = {}) {
  const amount = Number(input.amount)
  if (!input.userId) throw new Error('Người nhận là bắt buộc.')
  if (!['addition', 'deduction'].includes(input.type)) throw new Error('Loại điều chỉnh không hợp lệ.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền phải lớn hơn 0.')
  if (!input.description?.trim()) throw new Error('Nội dung là bắt buộc.')
  if (!input.date) throw new Error('Ngày là bắt buộc.')
  const now = new Date().toISOString()
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
    createdAt: current.createdAt ?? now,
    updatedAt: now,
  }
}

export async function listAdjustments() {
  return store.map((item) => structuredClone(item)).sort((a, b) => b.date.localeCompare(a.date))
}

export async function createAdjustment(input, currentUser) {
  if (!currentUser?.uid) throw new Error('Chưa xác định người dùng đang đăng nhập.')
  const adjustment = normalize(input, newId(), currentUser.uid)
  store = [adjustment, ...store]
  persist()
  return structuredClone(adjustment)
}

export async function updateAdjustment(id, input) {
  const current = store.find((item) => item.id === id)
  if (!current) throw new Error(`Không tìm thấy khoản điều chỉnh ${id}`)
  const updated = normalize({ ...current, ...input }, id, current.createdBy, current)
  store = store.map((item) => (item.id === id ? updated : item))
  persist()
  return structuredClone(updated)
}

export async function deleteAdjustment(id) {
  store = store.filter((item) => item.id !== id)
  persist()
  return id
}