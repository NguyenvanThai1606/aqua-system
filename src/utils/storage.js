/**
 * Đọc/ghi localStorage an toàn: không làm sập app khi bị chặn
 * (chế độ ẩn danh, quyền bị tắt…).
 */

export function readStorage(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* bỏ qua */
  }
}

/**
 * Đọc JSON từ localStorage.
 * Trả về `undefined` khi không có dữ liệu hoặc parse lỗi.
 */
export function readJsonStorage(key) {
  const raw = readStorage(key)
  if (raw === null) return undefined

  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** Ghi JSON vào localStorage. Trả về false nếu không ghi được. */
export function writeJsonStorage(key, value) {
  try {
    return writeStorage(key, JSON.stringify(value))
  } catch {
    return false
  }
}
