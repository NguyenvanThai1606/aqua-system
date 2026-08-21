import Icon from '../Icon'
import AttendanceStatusBadge from './AttendanceStatusBadge'
import { formatClock, formatMinutes, formatWorkedDuration } from '../../utils/attendanceUtils'

/**
 * Thẻ chấm công hôm nay: hiển thị khung giờ làm việc áp dụng (từ lịch hoặc
 * mặc định), trạng thái hiện tại, và nút Check-in/Check-out phù hợp.
 */
export default function CheckInOutCard({ record, schedule, onCheckIn, onCheckOut, busy }) {
  const dayStatus = !record ? 'not_checked_in' : !record.checkOutAt ? 'checked_in' : 'completed'

  return (
    <div className="attendance-checkcard">
      <div className="attendance-checkcard-head">
        <div>
          <p className="attendance-checkcard-label">Trạng thái hôm nay</p>
          <AttendanceStatusBadge kind="day" value={dayStatus} />
        </div>

        <div className="attendance-schedule-hint">
          <Icon name="clock" size={15} />
          <span>
            Ca làm việc: <strong>{schedule.start} – {schedule.end}</strong>
            {schedule.source === 'calendar' && schedule.eventTitle
              ? ` (theo lịch “${schedule.eventTitle}”)`
              : ' (mặc định)'}
          </span>
        </div>
      </div>

      <div className="attendance-checkcard-grid">
        <div className="attendance-checkcard-slot">
          <p className="field-label">Check-in</p>
          <p className="attendance-checkcard-time">{formatClock(record?.checkInAt)}</p>
          {record?.checkInAt && (
            <div className="attendance-checkcard-status">
              <AttendanceStatusBadge kind="checkIn" value={record.checkInStatus} />
              {record.checkInStatus === 'late' && (
                <span className="muted">trễ {formatMinutes(record.checkInLateMinutes)}</span>
              )}
            </div>
          )}
        </div>

        <div className="attendance-checkcard-slot">
          <p className="field-label">Check-out</p>
          <p className="attendance-checkcard-time">{formatClock(record?.checkOutAt)}</p>
          {record?.checkOutAt && (
            <div className="attendance-checkcard-status">
              <AttendanceStatusBadge kind="checkOut" value={record.checkOutStatus} />
              {record.checkOutStatus === 'early' && (
                <span className="muted">sớm {formatMinutes(record.checkOutEarlyMinutes)}</span>
              )}
            </div>
          )}
        </div>

        <div className="attendance-checkcard-slot">
          <p className="field-label">Tổng giờ làm</p>
          <p className="attendance-checkcard-time">{formatWorkedDuration(record?.checkInAt, record?.checkOutAt)}</p>
        </div>
      </div>

      <div className="attendance-checkcard-actions">
        {!record && (
          <button type="button" className="btn btn-primary" onClick={onCheckIn} disabled={busy}>
            <Icon name="login" size={16} />
            {busy ? 'Đang xử lý…' : 'Check-in'}
          </button>
        )}
        {record && !record.checkOutAt && (
          <button type="button" className="btn btn-primary" onClick={onCheckOut} disabled={busy}>
            <Icon name="logout" size={16} />
            {busy ? 'Đang xử lý…' : 'Check-out'}
          </button>
        )}
        {record?.checkOutAt && <p className="muted">Bạn đã hoàn thành chấm công cho hôm nay.</p>}
      </div>
    </div>
  )
}
