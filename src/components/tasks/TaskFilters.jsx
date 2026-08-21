import { useMemo, useState } from 'react'
import Icon from '../Icon'
import { TASK_PRIORITIES, TASK_STATUSES } from '../../data/taskMeta'
import useUserProfiles from '../../utils/useUserProfiles'
import { useAuth } from '../../utils/authContext'

/** Dải lọc trạng thái + mức ưu tiên + người phụ trách, kết hợp với ô tìm kiếm. */
export default function TaskFilters({ filters, onChange }) {
  const [keyword, setKeyword] = useState(filters.keyword)
  const [focused, setFocused] = useState(false)
  const { profiles: users, loading: usersLoading } = useUserProfiles()
  const { user: currentUser } = useAuth()

  const statusOptions = useMemo(() => [{ id: 'all', label: 'Tất cả trạng thái' }, ...TASK_STATUSES], [])
  const priorityOptions = useMemo(
    () => [{ id: 'all', label: 'Mọi mức ưu tiên' }, ...TASK_PRIORITIES],
    [],
  )

  // "Của tôi" dùng chính uid Firebase Auth hiện tại làm giá trị filter, nên
  // tái sử dụng nguyên vẹn logic so khớp `task.assignee.id === filters.assignee`
  // đã có (utils/taskUtils.js) — không cần sentinel/logic riêng. Loại người
  // dùng hiện tại khỏi danh sách chung bên dưới để tránh 2 option trùng giá trị.
  const otherUsers = useMemo(
    () => users.filter((profile) => profile.id !== currentUser?.uid),
    [users, currentUser],
  )

  const update = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="task-filters">
      <div className={focused ? 'task-search task-search-focused' : 'task-search'}>
        <Icon name="search" size={16} className="task-search-icon" />
        <input
          type="search"
          className="task-search-input"
          placeholder="Tìm theo tên hoặc mô tả…"
          value={keyword}
          aria-label="Tìm công việc"
          onChange={(event) => {
            setKeyword(event.target.value)
            update({ keyword: event.target.value })
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      <div className="task-filter-selects">
        <label className="sr-only" htmlFor="filter-status">
          Lọc theo trạng thái
        </label>
        <select
          id="filter-status"
          className="select task-filter-select"
          value={filters.status}
          onChange={(event) => update({ status: event.target.value })}
        >
          {statusOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-priority">
          Lọc theo mức ưu tiên
        </label>
        <select
          id="filter-priority"
          className="select task-filter-select"
          value={filters.priority}
          onChange={(event) => update({ priority: event.target.value })}
        >
          {priorityOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-assignee">
          Lọc theo người phụ trách
        </label>
        <select
          id="filter-assignee"
          className="select task-filter-select"
          value={filters.assignee}
          onChange={(event) => update({ assignee: event.target.value })}
          disabled={usersLoading}
        >
          <option value="all">Mọi người phụ trách</option>
          {currentUser && <option value={currentUser.uid}>Của tôi</option>}
          {otherUsers.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.displayName || profile.email}
            </option>
          ))}
          <option value="unassigned">Chưa phân công</option>
        </select>
      </div>
    </div>
  )
}
