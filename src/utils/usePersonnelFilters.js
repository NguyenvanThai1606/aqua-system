import { useMemo, useState } from 'react'
import { DEFAULT_EMPLOYMENT_STATUS } from '../data/employeeMeta'
import { getUserDepartmentIds } from '../services/userService'

const INITIAL_FILTERS = { keyword: '', departmentId: 'all', status: 'all' }

function displayNameOf(profile) {
  return profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'
}

function matchesKeyword(profile, keyword) {
  const query = keyword.trim().toLowerCase()
  if (!query) return true

  return (
    displayNameOf(profile).toLowerCase().includes(query) ||
    (profile.email ?? '').toLowerCase().includes(query)
  )
}

/** Giữ trạng thái bộ lọc Danh sách nhân sự — tìm kiếm + phòng ban + trạng thái. */
export default function usePersonnelFilters(profiles) {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const visibleProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      if (!matchesKeyword(profile, filters.keyword)) return false

      const departmentIds = getUserDepartmentIds(profile)

      if (filters.departmentId === 'none' && departmentIds.length > 0) return false
      if (
        filters.departmentId !== 'all' &&
        filters.departmentId !== 'none' &&
        !departmentIds.includes(filters.departmentId)
      ) {
        return false
      }

      if (
        filters.status !== 'all' &&
        (profile.employmentStatus ?? DEFAULT_EMPLOYMENT_STATUS) !== filters.status
      ) {
        return false
      }

      return true
    })
  }, [profiles, filters])

  const isFiltering =
    filters.keyword.trim() !== '' || filters.departmentId !== 'all' || filters.status !== 'all'

  return {
    filters,
    setFilters,
    visibleProfiles,
    isFiltering,
    resetFilters: () => setFilters(INITIAL_FILTERS),
  }
}
