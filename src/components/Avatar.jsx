import { useState } from 'react'
import cx from '../utils/cx'
import '../styles/avatar.css'

/**
 * Ảnh đại diện: ưu tiên ảnh thật (`photoURL`), fallback về chữ cái đầu.
 *
 * Ảnh có thể lỗi vì nhiều lý do THẬT trong hệ thống:
 *  - Người dùng đã xóa ảnh trong Storage nhưng `photoURL` cũ vẫn còn được
 *    nhúng trong `Project.manager` / `Task.assignee` (dữ liệu denormalize từ
 *    Phase 6 — xem `userService.toPersonRef()`);
 *  - URL ngoài nhập tay từ Phase 8 nay đã 404 / bị chặn CORS;
 *  - mất mạng giữa lúc tải ảnh.
 *
 * Khi đó `<img>` mặc định hiển thị icon ảnh hỏng. Ở đây bắt `onError` để
 * quay về chữ cái đầu — không crash, không để lại ô trống. So sánh state với
 * chính `photoURL` (thay vì cờ boolean) để khi `photoURL` đổi sang giá trị
 * MỚI thì tự động thử tải lại, không cần `useEffect` reset.
 */
export default function Avatar({ name, initials, photoURL, size = 'md', className }) {
  const [failedURL, setFailedURL] = useState(null)

  const label =
    initials ??
    name
      ?.trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()

  if (photoURL && failedURL !== photoURL) {
    return (
      <img
        src={photoURL}
        alt={name ?? ''}
        className={cx('avatar', 'avatar-image', `avatar-${size}`, className)}
        onError={() => setFailedURL(photoURL)}
      />
    )
  }

  return (
    <span
      className={cx('avatar', `avatar-${size}`, className)}
      title={name}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}
