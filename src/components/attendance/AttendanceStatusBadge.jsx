import {
  getCheckInStatusMeta,
  getCheckOutStatusMeta,
  getDayStatusMeta,
} from '../../data/attendanceMeta'

/** `kind`: 'day' (tổng quan) | 'checkIn' | 'checkOut'. */
export default function AttendanceStatusBadge({ kind, value }) {
  const meta =
    kind === 'checkIn'
      ? getCheckInStatusMeta(value)
      : kind === 'checkOut'
        ? getCheckOutStatusMeta(value)
        : getDayStatusMeta(value)

  if (!meta) return <span className="badge badge-neutral">—</span>

  return <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
}
