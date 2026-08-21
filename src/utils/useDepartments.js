import { useCallback, useEffect, useState } from 'react'
import { listDepartments } from '../services/departmentService'

/**
 * Danh sách phòng ban thật từ Firestore (`departments` collection) — dùng
 * cho tab "Cơ cấu tổ chức" và các ô chọn phòng ban trong module Nhân sự
 * (Phase 10). Cùng phong cách với `useUserProfiles.js`.
 */
export default function useDepartments(enabled = true) {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(enabled)

  const reload = useCallback(async () => {
    if (!enabled) {
      setDepartments([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await listDepartments()
      setDepartments(data)
    } catch (error) {
      console.error('[useDepartments] Không tải được danh sách phòng ban:', error)
      setDepartments([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { departments, loading, reload }
}
