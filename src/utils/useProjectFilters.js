import { useMemo, useState } from 'react'
import { filterProjects, sortProjects } from '../utils/projectUtils'

const INITIAL_FILTERS = {
  keyword: '',
  status: 'all',
  customer: 'all',
  manager: 'all',
}

/** Giữ trạng thái bộ lọc và trả về danh sách đã lọc + sắp xếp. */
export default function useProjectFilters(projects) {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const visibleProjects = useMemo(
    () => sortProjects(filterProjects(projects, filters)),
    [projects, filters],
  )

  const isFiltering = useMemo(
    () =>
      filters.keyword.trim() !== '' ||
      filters.status !== 'all' ||
      filters.customer !== 'all' ||
      filters.manager !== 'all',
    [filters],
  )

  return {
    filters,
    setFilters,
    visibleProjects,
    isFiltering,
    resetFilters: () => setFilters(INITIAL_FILTERS),
  }
}
