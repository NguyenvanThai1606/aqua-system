import { useState } from 'react'
import Icon from '../Icon'
import { EMPLOYMENT_STATUSES } from '../../data/employeeMeta'

/** Dải lọc tìm kiếm + phòng ban + trạng thái làm việc cho Danh sách nhân sự. */
export default function PersonnelFilters({ filters, onChange, departments, departmentsLoading }) {
  const [keyword, setKeyword] = useState(filters.keyword)
  const [focused, setFocused] = useState(false)

  const update = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="personnel-filters">
      <div className={focused ? 'personnel-search personnel-search-focused' : 'personnel-search'}>
        <Icon name="search" size={16} className="personnel-search-icon" />
        <input
          type="search"
          className="personnel-search-input"
          placeholder="Tìm theo tên hoặc email…"
          value={keyword}
          aria-label="Tìm nhân sự"
          onChange={(event) => {
            setKeyword(event.target.value)
            update({ keyword: event.target.value })
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      <div className="personnel-filter-selects">
        <label className="sr-only" htmlFor="filter-personnel-department">
          Lọc theo phòng ban
        </label>
        <select
          id="filter-personnel-department"
          className="select personnel-filter-select"
          value={filters.departmentId}
          onChange={(event) => update({ departmentId: event.target.value })}
          disabled={departmentsLoading}
        >
          <option value="all">Mọi phòng ban</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
          <option value="none">Chưa phân bổ</option>
        </select>

        <label className="sr-only" htmlFor="filter-personnel-status">
          Lọc theo trạng thái
        </label>
        <select
          id="filter-personnel-status"
          className="select personnel-filter-select"
          value={filters.status}
          onChange={(event) => update({ status: event.target.value })}
        >
          <option value="all">Mọi trạng thái</option>
          {EMPLOYMENT_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
