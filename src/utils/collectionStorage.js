/**
 * Nạp/lưu collection document qua localStorage.
 *
 * Lần đầu (chưa có key): dùng `initialData` → ghi xuống storage → trả về bản copy.
 * Các lần sau: đọc từ storage; parse lỗi thì fallback về `initialData`.
 * Storage không khả dụng: chạy in-memory, không ghi được thì bỏ qua.
 */

import { readJsonStorage, writeJsonStorage } from './storage'

export function loadCollection(key, initialData) {
  const saved = readJsonStorage(key)

  if (Array.isArray(saved)) {
    return saved.map((item) => structuredClone(item))
  }

  const initial = initialData.map((item) => structuredClone(item))
  writeJsonStorage(key, initial)
  return initial
}

export function saveCollection(key, data) {
  writeJsonStorage(key, data)
}
