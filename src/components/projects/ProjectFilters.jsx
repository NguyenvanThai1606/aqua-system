import { useMemo, useState } from 'react'
import Icon from '../Icon'
import { PROJECT_STATUSES } from '../../data/projectMeta'
import { getDistinctCustomers } from '../../utils/projectUtils'
import useUserProfiles from '../../utils/useUserProfiles'

/** Dải lọc trạng thái + khách hàng + người phụ trách, kết hợp với ô tìm kiếm. */
export default function ProjectFilters({ filters, onChange, projects = [] }) {
  const [keyword, setKeyword] = useState(filters.keyword)
  const [focused, setFocused] = useState(false)
  const { profiles: users, loading: usersLoading } = useUserProfiles()

  const statusOptions = useMemo(
    () => [{ id: 'all', label: 'Tất cả trạng thái' }, ...PROJECT_STATUSES],
    [],
  )

  // Danh mục khách hàng cố định (`data/customers.js`) đã bị bỏ ở Phase 15 —
  // khách hàng giờ là trường tự do trên từng dự án, nên bộ lọc chỉ liệt kê
  // khách hàng THẬT SỰ đang xuất hiện trong danh sách dự án hiện có.
  const customerOptions = useMemo(() => getDistinctCustomers(projects), [projects])

  const update = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="project-filters">
      <div className={focused ? 'project-search project-search-focused' : 'project-search'}>
        <Icon name="search" size={16} className="project-search-icon" />
        <input
          type="search"
          className="project-search-input"
          placeholder="Tìm theo tên, mô tả hoặc khách hàng…"
          value={keyword}
          aria-label="Tìm dự án"
          onChange={(event) => {
            setKeyword(event.target.value)
            update({ keyword: event.target.value })
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      <div className="project-filter-selects">
        <label className="sr-only" htmlFor="filter-project-status">
          Lọc theo trạng thái
        </label>
        <select
          id="filter-project-status"
          className="select project-filter-select"
          value={filters.status}
          onChange={(event) => update({ status: event.target.value })}
        >
          {statusOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-project-customer">
          Lọc theo khách hàng
        </label>
        <select
          id="filter-project-customer"
          className="select project-filter-select"
          value={filters.customer}
          onChange={(event) => update({ customer: event.target.value })}
        >
          <option value="all">Mọi khách hàng</option>
          {customerOptions.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
          <option value="none">Chưa có khách hàng</option>
        </select>

        <label className="sr-only" htmlFor="filter-project-manager">
          Lọc theo người phụ trách
        </label>
        <select
          id="filter-project-manager"
          className="select project-filter-select"
          value={filters.manager}
          onChange={(event) => update({ manager: event.target.value })}
          disabled={usersLoading}
        >
          <option value="all">Mọi người phụ trách</option>
          {users.map((profile) => (
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
