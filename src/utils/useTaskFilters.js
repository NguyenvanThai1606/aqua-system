import { useMemo, useState } from 'react'
import { filterTasks } from '../utils/taskUtils'

const INITIAL_FILTERS = {
  keyword: '',
  status: 'all',
  priority: 'all',
  assignee: 'all',
}

/** Giữ trạng thái bộ lọc và trả về danh sách đã lọc. */
export default function useTaskFilters(tasks) {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const visibleTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])

  const isFiltering = useMemo(
    () =>
      filters.keyword.trim() !== '' ||
      filters.status !== 'all' ||
      filters.priority !== 'all' ||
      filters.assignee !== 'all',
    [filters],
  )

  return {
    filters,
    setFilters,
    visibleTasks,
    isFiltering,
    resetFilters: () => setFilters(INITIAL_FILTERS),
  }
}
