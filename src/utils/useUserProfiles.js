import { useCallback, useEffect, useState } from 'react'
import { listUserProfiles } from '../services/userService'

/**
 * Danh sách user thật từ Firestore (`users` collection) — dùng cho các ô
 * chọn "Người phụ trách"/"Người được giao" (Project.manager / Task.assignee)
 * ở Phase 6, thay cho danh sách tĩnh cũ `data/members.js`. Từ Phase 7, list
 * mở cho MỌI user đã đăng nhập (`allow list: if isSignedIn();`) — không còn
 * giới hạn admin — nên module Nhân sự (Phase 10) cũng dùng lại hook này làm
 * nguồn danh bạ nhân sự cho tab "Danh sách nhân sự"/"Cơ cấu tổ chức".
 *
 * `reload` cho phép tầng gọi tự làm mới danh sách sau khi ghi (vd. admin
 * vừa sửa chức vụ/phòng ban ở `NhanSuPage.jsx`) mà không cần unmount lại
 * component đang giữ hook.
 */
export default function useUserProfiles(enabled = true) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(enabled)

  const reload = useCallback(async () => {
    if (!enabled) {
      setProfiles([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await listUserProfiles()
      setProfiles(data)
    } catch (error) {
      console.error('[useUserProfiles] Không tải được danh sách người dùng:', error)
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { profiles, loading, reload }
}
