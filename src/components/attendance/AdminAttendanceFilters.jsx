import { DAY_STATUSES } from '../../data/attendanceMeta'
import useUserProfiles from '../../utils/useUserProfiles'

/** Bộ lọc bảng chấm công admin — theo nhân viên, tháng và trạng thái ngày công. */
export default function AdminAttendanceFilters({ filters, onChange }) {
  const { profiles: users, loading: usersLoading } = useUserProfiles()

  const update = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="attendance-filters">
      <div className="field">
        <label className="field-label" htmlFor="attendance-filter-employee">
          Nhân viên
        </label>
        <select
          id="attendance-filter-employee"
          className="select"
          value={filters.employeeId}
          onChange={(event) => update({ employeeId: event.target.value })}
          disabled={usersLoading}
        >
          <option value="all">Toàn bộ nhân viên</option>
          {users.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.displayName || profile.email}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="attendance-filter-month">
          Tháng
        </label>
        <input
          id="attendance-filter-month"
          type="month"
          className="input"
          value={filters.month}
          onChange={(event) => update({ month: event.target.value })}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="attendance-filter-status">
          Trạng thái
        </label>
        <select
          id="attendance-filter-status"
          className="select"
          value={filters.status}
          onChange={(event) => update({ status: event.target.value })}
        >
          <option value="all">Mọi trạng thái</option>
          {DAY_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
