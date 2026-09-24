import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../utils/authContext'
import {
  getCurrentUser,
  onAuthChange,
  signIn,
  signUp,
  signOut as authSignOut,
} from '../services/authService'
import { DEFAULT_ROLE, ensureUserProfile, subscribeUserProfile } from '../services/userService'

/**
 * Quản lý trạng thái Authentication + Role cho toàn bộ ứng dụng.
 *
 * Bọc `onAuthChange()` (wrapper của `onAuthStateChanged`) từ
 * `services/authService.js` — không tự gọi Firebase SDK trực tiếp.
 *
 * `loading` = true cho đến khi Firebase Auth xác định xong trạng thái
 * ban đầu (kể cả khi F5/reload); trong lúc đó KHÔNG coi user là
 * logged-out để tránh flash/redirect sai ở các bước sau (routing, UI...).
 *
 * Role (admin/user) LUÔN được đọc từ Firestore (`services/userService.js`),
 * KHÔNG BAO GIỜ lưu ở localStorage/sessionStorage và KHÔNG suy ra từ email.
 * `roleLoading` = true trong lúc chờ Firestore trả về role sau khi đăng
 * nhập — các route/nút quản trị phải chờ giá trị này ổn định trước khi
 * quyết định hiển thị, để tránh flash sai quyền.
 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [permissions, setPermissions] = useState([])
  // Khởi tạo TRUE — "chưa biết role", không phải "role đã xác định là user".
  //
  // Nếu khởi tạo false thì ngay sau khi Firebase Auth xác nhận đăng nhập,
  // render ĐẦU TIÊN có `user` nhưng chưa chạy effect đọc role bên dưới, nên
  // `role` vẫn null → `isAdmin` false → `RequireAdmin` lập tức
  // `<Navigate to="/" />`. Effect đặt `roleLoading = true` chỉ chạy SAU khi
  // render đó commit, tức là quá muộn. Hệ quả: admin mở trực tiếp URL
  // `/quan-tri/nguoi-dung` (hoặc bấm F5 trên trang đó) luôn bị đá về Dashboard
  // dù Firestore ghi đúng role 'admin'. Mặc định true khiến trạng thái chưa
  // xác định luôn fail-closed và mọi guard đều phải chờ role thật.
  const [roleLoading, setRoleLoading] = useState(true)
  // Bộ đếm ép render lại khi Firebase Auth sửa `currentUser` TẠI CHỖ — xem
  // `refreshUser` bên dưới. Cố tình KHÔNG nằm trong dependency của effect
  // đọc role, để việc lưu hồ sơ không làm role phải tải lại.
  const [profileVersion, setProfileVersion] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthChange((nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) {
      setRole(null)
      setPermissions([])
      setRoleLoading(false)
      return undefined
    }

    let active = true
    // Reset NGAY role về null (chưa xác định) mỗi khi user đổi — kể cả khi
    // chuyển thẳng từ user A sang user B (không đăng xuất giữa chừng), chứ
    // không chỉ khi user biến mất hoàn toàn. Nếu không reset ở đây, trong
    // lúc chờ Firestore trả role thật của user B, `role` sẽ tạm thời vẫn
    // giữ giá trị CŨ của user A (ví dụ 'admin') → Sidebar/UserMenu hiển thị
    // nhầm quyền admin cho tài khoản mới trong vài trăm ms đầu.
    setRole(null)
    setRoleLoading(true)

    // Đảm bảo hồ sơ Firestore tồn tại (role mặc định 'user' nếu là tài khoản
    // mới) — KHÔNG BAO GIỜ tạo với role 'admin'. Không await ở đây vì
    // subscribeUserProfile bên dưới sẽ tự nhận giá trị mới nhất qua realtime.
    ensureUserProfile(user).catch((error) => {
      console.error('[AuthProvider] Không thể khởi tạo hồ sơ người dùng:', error)
    })

    const unsubscribeProfile = subscribeUserProfile(user.uid, (profile) => {
      if (!active) return
      setRole(profile?.role ?? DEFAULT_ROLE)
      setPermissions(Array.isArray(profile?.permissions) ? profile.permissions : [])
      setRoleLoading(false)
    })

    return () => {
      active = false
      unsubscribeProfile()
    }
  }, [user])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      role,
      permissions,
      hasPermission: (permission) => permissions.includes(permission),
      roleLoading,
      isAdmin: role === 'admin',
      login: (email, password) => signIn(email, password),
      register: (email, password) => signUp(email, password),
      logout: () => authSignOut(),
      // Firebase Auth mutates `auth.currentUser` TẠI CHỖ khi gọi
      // `updateProfile()` (đổi displayName/photoURL) — nó không tự phát
      // sinh sự kiện `onAuthStateChanged` mới, nên `user` trong context sẽ
      // không tự re-render. Gọi hàm này NGAY SAU khi cập nhật profile (xem
      // `ProfilePage.jsx`) để UserMenu/Avatar hiển thị ảnh mới ngay, không
      // cần tải lại trang.
      //
      // Chỉ tăng `profileVersion` chứ KHÔNG làm `setUser({ ...current })`.
      // Bản sao nông đó gây hai lỗi thật:
      //   1. Nó biến `User` của Firebase thành object thường, mất hết method
      //      (`getIdToken()`, `reload()`, …) và các field nội bộ.
      //   2. Nó đổi identity của `user` → effect `[user]` ở trên chạy lại →
      //      `setRoleLoading(true)` và hủy/tạo lại subscription Firestore sau
      //      MỖI lần lưu hồ sơ. Trong khoảng đó `isAdmin && !roleLoading` là
      //      false nên mục "Quản lý người dùng" biến mất khỏi Sidebar/UserMenu
      //      và badge vai trò nhấp nháy "Đang tải…" — trông như mất quyền
      //      admin dù Firestore không hề đổi.
      // Vì object `user` là CHÍNH object vừa được Firebase sửa tại chỗ, chỉ
      // cần tạo lại context value là mọi consumer đọc được giá trị mới.
      refreshUser: () => {
        const current = getCurrentUser()
        // Trường hợp hiếm: Firebase thay hẳn instance (đổi tài khoản) — lúc
        // đó vẫn phải cập nhật state theo đường bình thường.
        if (current) setUser((previous) => (current === previous ? previous : current))
        setProfileVersion((version) => version + 1)
      },
    }),
    [user, loading, role, permissions, roleLoading, profileVersion],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
