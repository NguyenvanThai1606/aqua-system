import AttendanceStatusBadge from './AttendanceStatusBadge'
import { formatShortDate } from '../../utils/calendarUtils'
import { dayStatusOf, formatClock, formatWorkedDuration } from '../../utils/attendanceUtils'

/** `showEmployee`: hiện thêm cột Nhân viên — dùng cho bảng admin. */
export default function AttendanceHistoryTable({ records, showEmployee = false }) {
  if (records.length === 0) {
    return <p className="attendance-state muted">Không có bản ghi chấm công nào khớp điều kiện.</p>
  }

  return (
    <div className="attendance-table-wrap">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Ngày</th>
            {showEmployee && <th>Nhân viên</th>}
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Tổng giờ làm</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{formatShortDate(record.date)}</td>
              {showEmployee && <td>{record.userName || record.userId}</td>}
              <td>
                <div className="attendance-table-cell">
                  <span>{formatClock(record.checkInAt)}</span>
                  {record.checkInAt && <AttendanceStatusBadge kind="checkIn" value={record.checkInStatus} />}
                </div>
              </td>
              <td>
                <div className="attendance-table-cell">
                  <span>{formatClock(record.checkOutAt)}</span>
                  {record.checkOutAt && <AttendanceStatusBadge kind="checkOut" value={record.checkOutStatus} />}
                </div>
              </td>
              <td>{formatWorkedDuration(record.checkInAt, record.checkOutAt)}</td>
              <td>
                <AttendanceStatusBadge kind="day" value={dayStatusOf(record)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
