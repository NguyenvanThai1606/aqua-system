/**
 * Tiện ích chuyển đổi dữ liệu giữa Firestore và schema AQUA.
 */

/** Firestore Timestamp / Date / chuỗi ISO → chuỗi ISO. */
export function timestampToIso(value) {
  if (!value) return new Date().toISOString()

  if (typeof value === 'string') return value

  if (value instanceof Date) return value.toISOString()

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }

  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString()
  }

  return new Date().toISOString()
}

/** Bỏ `id` và giá trị undefined trước khi ghi Firestore. */
export function toFirestorePayload(record) {
  const payload = { ...record }
  delete payload.id

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  )
}

/** Bắt lỗi Firebase và bọc message rõ ràng hơn. */
export function wrapFirestoreError(error, action) {
  const code = error?.code ?? 'unknown'
  const message = error?.message ?? String(error)
  return new Error(`Firestore ${action} thất bại (${code}): ${message}`)
}

/**
 * Chặn trên thời gian chờ của một promise Firebase — LUÔN settle.
 *
 * Cần thiết vì hai SDK đều có trạng thái "treo vô hạn" hợp lệ về mặt thiết kế:
 *  - Firestore: khi mất mạng, `updateDoc()` xếp write vào hàng đợi offline và
 *    promise KHÔNG reject, cũng không resolve, cho tới khi liên lạc lại được
 *    server. Không có mã lỗi nào phát ra.
 *  - Storage: `uploadBytes()` tự thử lại trong `maxUploadRetryTime`.
 *
 * Không bọc thì mọi `finally { setLoading(false) }` ở tầng UI đều vô nghĩa —
 * nút bấm sẽ đứng ở trạng thái "Đang lưu…" vĩnh viễn. Lưu ý: hết hạn ở đây chỉ
 * có nghĩa "chưa xác nhận được", KHÔNG có nghĩa là write đã bị hủy; Firestore
 * vẫn có thể gửi write đó khi có mạng lại. Vì vậy message phải nói đúng như vậy
 * thay vì khẳng định thất bại.
 *
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} action Tên thao tác, đưa vào message lỗi.
 * @returns {Promise<T>}
 * @template T
 */
export function withTimeout(promise, ms, action) {
  let timer = null

  const guard = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `${action} không phản hồi sau ${Math.round(ms / 1000)} giây. Kiểm tra kết nối mạng rồi thử lại.`,
        ),
      )
    }, ms)
  })

  return Promise.race([promise, guard]).finally(() => {
    if (timer !== null) clearTimeout(timer)
  })
}
