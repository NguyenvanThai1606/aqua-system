/**
 * Ánh xạ lỗi Firebase Authentication sang thông báo tiếng Việt thân thiện.
 *
 * `authService.js` ném ra:
 *  - Lỗi Firebase Auth gốc (có `.code`, dạng "auth/...") khi thao tác thất bại.
 *  - `Error` thường (không có `.code`) khi Firebase chưa được cấu hình.
 */

const MESSAGE_BY_CODE = {
  'auth/invalid-credential': 'Sai email hoặc mật khẩu.',
  'auth/wrong-password': 'Sai email hoặc mật khẩu.',
  'auth/user-not-found': 'Sai email hoặc mật khẩu.',
  'auth/invalid-email': 'Email không hợp lệ.',
  'auth/email-already-in-use': 'Email đã được sử dụng.',
  'auth/weak-password': 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác.',
  'auth/too-many-requests': 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.',
  'auth/network-request-failed': 'Không thể kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.',
  'auth/user-disabled': 'Tài khoản này đã bị vô hiệu hóa.',
}

const DEFAULT_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại.'

/**
 * Trả về thông báo lỗi tiếng Việt thân thiện từ lỗi ném ra bởi `authService`.
 * @param {unknown} error
 * @returns {string}
 */
export function getAuthErrorMessage(error) {
  if (!error) return DEFAULT_MESSAGE

  // Lỗi cấu hình Firebase (Error thường, không có `.code`) — dùng luôn message
  // thân thiện đã có sẵn từ `authService.requireAuth()`.
  if (!error.code && error.message) {
    return error.message
  }

  return MESSAGE_BY_CODE[error.code] || DEFAULT_MESSAGE
}
