import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { useAuth } from '../utils/authContext'
import { useToast } from '../utils/toastContext'
import { resolveDisplayName, updateOwnProfile } from '../services/userService'
import { updateAuthDisplayProfile } from '../services/authService'
import '../styles/profile.css'

const ROLE_LABEL = {
  admin: 'Quản trị viên',
  user: 'Thành viên',
}

/** Giới hạn độ dài URL — khớp `isValidPhotoURL()` trong `firestore.rules`. */
const PHOTO_URL_MAX_LENGTH = 2048

/**
 * Kiểm tra URL ảnh đại diện TRƯỚC khi lưu (lớp UX, không phải bảo mật).
 *
 * Chuỗi rỗng hợp lệ (nghĩa là "không có ảnh, dùng chữ cái đầu"). Nếu có
 * nhập thì phải là `http(s)://...` và không vượt quá độ dài mà
 * `firestore.rules` cho phép — `Firestore` mới là nơi chặn thật.
 *
 * @param {string} value
 */
function validatePhotoURL(value) {
  const trimmed = value.trim()
  if (!trimmed) return { ok: true }

  if (!/^https?:\/\/\S+$/i.test(trimmed)) {
    return { ok: false, message: 'URL ảnh phải bắt đầu bằng http:// hoặc https://' }
  }

  if (trimmed.length > PHOTO_URL_MAX_LENGTH) {
    return { ok: false, message: `URL quá dài (tối đa ${PHOTO_URL_MAX_LENGTH} ký tự).` }
  }

  return { ok: true }
}

/**
 * Hồ sơ cá nhân của tài khoản đang đăng nhập.
 *
 * - Email/UID: đọc từ Firebase Auth, không thể sửa ở đây.
 * - Vai trò: đọc từ Firestore `users/{uid}` (qua AuthProvider), không thể
 *   tự sửa — chỉ admin đổi được, ở trang Quản lý người dùng.
 * - Họ tên / ảnh đại diện: ghi vào Firestore `users/{uid}` (nguồn chính),
 *   đồng thời đồng bộ sang Firebase Auth để UserMenu/Avatar cập nhật ngay.
 *
 * PHASE 9 — ảnh đại diện là URL NGƯỜI DÙNG TỰ DÁN, KHÔNG dùng Firebase
 * Storage. Project tiếp tục chạy trên gói Firebase Spark (miễn phí), không
 * cần nâng cấp Blaze. Người dùng dán URL ảnh (ví dụ ảnh đã có sẵn trên
 * internet) vào ô "URL ảnh đại diện" bên dưới; bấm "Lưu thay đổi" chỉ ghi
 * đúng chuỗi URL đó vào `users/{uid}.photoURL` qua Firestore — không có
 * bước upload file nào cả.
 *
 * Thứ tự khi lưu: 1. validate URL ở client (chỉ để UX) → 2. ghi Firebase
 * Auth → 3. ghi Firestore `users/{uid}.photoURL` → 4. refreshUser() → 5. toast.
 *
 * Vì sao ghi Auth TRƯỚC Firestore: `ensureUserProfile()` (chạy mỗi lần đăng
 * nhập) coi Firebase Auth là nguồn để đồng bộ displayName/photoURL xuống
 * Firestore. Nếu bước Firestore thất bại, lần đồng bộ sau sẽ tự chữa đúng
 * hướng (Auth mới → Firestore). Làm ngược lại thì Auth CŨ sẽ ghi đè
 * Firestore MỚI và người dùng mất URL vừa lưu. Dù vậy, thất bại ở bước
 * Firestore vẫn được báo lỗi THẬT — không báo thành công giả (xem
 * `handleSubmit`).
 */
export default function ProfilePage() {
  const { user, role, roleLoading, refreshUser } = useAuth()
  const toast = useToast()

  const [displayName, setDisplayName] = useState('')
  const [photoURLInput, setPhotoURLInput] = useState('')
  const [urlError, setUrlError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setDisplayName(resolveDisplayName(user))
    setPhotoURLInput(user.photoURL ?? '')
  }, [user])

  if (!user) return null

  const currentName = resolveDisplayName(user)
  const trimmedName = displayName.trim()
  const savedPhotoURL = user.photoURL ?? ''
  const trimmedPhotoURL = photoURLInput.trim()
  // Ảnh xem trước ngay khi gõ/dán URL — Avatar tự fallback về chữ cái đầu
  // nếu URL rỗng hoặc ảnh không tải được (xem `components/Avatar.jsx`).
  const shownPhotoURL = trimmedPhotoURL || null
  const isDirty = trimmedName !== currentName || trimmedPhotoURL !== savedPhotoURL
  const busy = saving

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!trimmedName) {
      toast.error('Không thể cập nhật hồ sơ. Vui lòng thử lại.', {
        message: 'Họ tên không được để trống.',
      })
      return
    }

    const validation = validatePhotoURL(photoURLInput)
    if (!validation.ok) {
      setUrlError(validation.message)
      return
    }
    setUrlError(null)

    setSaving(true)

    const patch = { displayName: trimmedName, photoURL: trimmedPhotoURL || null }

    try {
      await updateAuthDisplayProfile(patch)
      await updateOwnProfile(user.uid, patch)
      refreshUser()
      toast.success('Cập nhật hồ sơ thành công.')
    } catch (error) {
      // Firebase Auth có thể đã cập nhật, nhưng hồ sơ Firestore thì chưa →
      // KHÔNG báo thành công. Vẫn gọi refreshUser() để UI hiển thị đúng
      // trạng thái thật hiện tại của Auth (tránh việc màn hình nói một
      // đằng, dữ liệu một nẻo).
      refreshUser()
      toast.error('Không thể cập nhật hồ sơ. Vui lòng thử lại.', {
        message: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        icon="employees"
        title="Hồ sơ cá nhân"
        description="Thông tin tài khoản Firebase đang đăng nhập."
      />

      <Card>
        <div className="profile-avatar-block">
          <Avatar name={trimmedName || currentName} photoURL={shownPhotoURL} size="xl" />

          <div className="profile-avatar-info">
            <p className="profile-avatar-name">{trimmedName || currentName}</p>
            <p className="muted">{user.email}</p>
            <p className="profile-avatar-hint muted">
              Dán URL của một ảnh có sẵn trên internet — không upload file.
            </p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="grid grid-auto">
            <div className="field">
              <label className="field-label" htmlFor="profile-name">
                Họ tên
              </label>
              <input
                id="profile-name"
                type="text"
                className="input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Nhập họ tên hiển thị"
                maxLength={80}
                disabled={busy}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="profile-email">
                Email
              </label>
              <input id="profile-email" type="email" className="input" value={user.email ?? ''} disabled />
            </div>

            <div className="field">
              <span className="field-label">Vai trò</span>
              <div>
                <span className={`badge ${role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                  {roleLoading ? 'Đang tải…' : (ROLE_LABEL[role] ?? ROLE_LABEL.user)}
                </span>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="profile-photo-url">
                URL ảnh đại diện
              </label>
              <input
                id="profile-photo-url"
                type="url"
                className="input"
                value={photoURLInput}
                onChange={(event) => {
                  setPhotoURLInput(event.target.value)
                  if (urlError) setUrlError(null)
                }}
                placeholder="https://..."
                maxLength={PHOTO_URL_MAX_LENGTH}
                disabled={busy}
              />
              {urlError && (
                <p className="profile-avatar-error" role="alert">
                  <Icon name="error" size={15} />
                  {urlError}
                </p>
              )}
            </div>
          </div>

          <p className="muted" style={{ fontSize: 12.5 }}>
            Ảnh đại diện là URL bạn tự dán, được lưu trong Firestore — không upload file, không dùng
            Firebase Storage. Email, vai trò và UID không thể sửa tại đây.
          </p>

          <p className="muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>
            UID: {user.uid}
          </p>

          <div>
            <button type="submit" className="btn btn-primary" disabled={busy || !isDirty}>
              {saving && <span className="auth-spinner" aria-hidden="true" />}
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Card>
    </>
  )
}
