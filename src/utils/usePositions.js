import { useCallback, useEffect, useState } from 'react'
import { listPositions } from '../services/positionService'

/**
 * Danh mục chức vụ thật từ Firestore (`positions` collection, Phase 15) —
 * dùng ở `AdminUsersPage` (quản lý danh mục) và ô chọn "Chức vụ" trong
 * `PersonnelDetailModal`. Cùng phong cách với `useDepartments.js`.
 */
export default function usePositions(enabled = true) {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(enabled)

  const reload = useCallback(async () => {
    if (!enabled) {
      setPositions([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await listPositions()
      setPositions(data)
    } catch (error) {
      console.error('[usePositions] Không tải được danh mục chức vụ:', error)
      setPositions([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { positions, loading, reload }
}
