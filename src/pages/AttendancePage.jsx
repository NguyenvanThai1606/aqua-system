import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import CheckInOutCard from '../components/attendance/CheckInOutCard'
import AttendanceHistoryTable from '../components/attendance/AttendanceHistoryTable'
import AdminAttendanceFilters from '../components/attendance/AdminAttendanceFilters'
import { useAuth } from '../utils/authContext'
import { useToast } from '../utils/toastContext'
import { useEvents } from '../utils/eventsContext'
import { resolveDisplayName } from '../services/userService'
import * as attendanceService from '../services/attendanceService'
import { toISODate } from '../utils/calendarUtils'
import { evaluateCheckIn, evaluateCheckOut, getWorkScheduleForDate, sumWorkedMinutes, formatMinutes } from '../utils/attendanceUtils'
import '../styles/attendance.css'

const TABS = [
  { id: 'me', label: 'Chấm công của tôi' },
  { id: 'all', label: 'Toàn bộ nhân viên' },
]

const EMPTY_ADMIN_FILTERS = { employeeId: 'all', month: '', status: 'all' }

export default function AttendancePage() {
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const { events } = useEvents()

  const todayIso = toISODate(new Date())

  const [tab, setTab] = useState('me')
  const [todayRecord, setTodayRecord] = useState(null)
  const [myHistory, setMyHistory] = useState([])
  const [allRecords, setAllRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminLoading, setAdminLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [adminFilters, setAdminFilters] = useState(EMPTY_ADMIN_FILTERS)

  const schedule = useMemo(
    () => getWorkScheduleForDate(events, todayIso, user?.uid),
    [events, todayIso, user],
  )

  useEffect(() => {
    if (!user) return
    let active = true

    setLoading(true)
    Promise.all([
      attendanceService.getAttendanceRecord(user.uid, todayIso),
      attendanceService.listMyAttendance(user.uid),
    ])
      .then(([record, history]) => {
        if (!active) return
        setTodayRecord(record)
        setMyHistory(history)
      })
      .catch((error) => {
        console.error('[AttendancePage] Không tải được dữ liệu chấm công:', error)
        if (active) {
          setTodayRecord(null)
          setMyHistory([])
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user, todayIso])

  useEffect(() => {
    if (tab !== 'all' || !isAdmin) return
    let active = true

    setAdminLoading(true)
    attendanceService
      .listAllAttendance()
      .then((data) => {
        if (active) setAllRecords(data)
      })
      .catch((error) => {
        console.error('[AttendancePage] Không tải được chấm công toàn công ty:', error)
        if (active) setAllRecords([])
      })
      .finally(() => {
        if (active) setAdminLoading(false)
      })

    return () => {
      active = false
    }
  }, [tab, isAdmin])

  const handleCheckIn = async () => {
    if (!user || busy) return
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const { status, lateMinutes } = evaluateCheckIn(now, schedule.start)

      const record = await attendanceService.checkIn({
        userId: user.uid,
        userName: resolveDisplayName(user),
        userEmail: user.email ?? null,
        date: todayIso,
        checkInAt: now,
        checkInStatus: status,
        checkInLateMinutes: lateMinutes,
        scheduleStart: schedule.start,
        scheduleEnd: schedule.end,
        scheduleSource: schedule.source,
        scheduleEventTitle: schedule.eventTitle ?? null,
      })

      setTodayRecord(record)
      setMyHistory((current) => [record, ...current.filter((item) => item.date !== todayIso)])
      toast.success(
        status === 'late' ? `Đã check-in — trễ ${formatMinutes(lateMinutes)}` : 'Đã check-in — đúng giờ',
      )
    } catch (error) {
      toast.error('Không thể check-in', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleCheckOut = async () => {
    if (!user || busy || !todayRecord) return
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const { status, earlyMinutes } = evaluateCheckOut(now, schedule.end)

      const updated = await attendanceService.checkOut(user.uid, todayIso, {
        checkOutAt: now,
        checkOutStatus: status,
        checkOutEarlyMinutes: earlyMinutes,
      })

      setTodayRecord(updated)
      setMyHistory((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(
        status === 'early' ? `Đã check-out — về sớm ${formatMinutes(earlyMinutes)}` : 'Đã check-out — đúng giờ',
      )
    } catch (error) {
      toast.error('Không thể check-out', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setBusy(false)
    }
  }

  const filteredAdminRecords = useMemo(() => {
    return allRecords.filter((record) => {
      if (adminFilters.employeeId !== 'all' && record.userId !== adminFilters.employeeId) return false
      if (adminFilters.month && !record.date.startsWith(adminFilters.month)) return false
      if (adminFilters.status !== 'all') {
        const status = !record.checkInAt ? 'not_checked_in' : !record.checkOutAt ? 'checked_in' : 'completed'
        if (status !== adminFilters.status) return false
      }
      return true
    })
  }, [allRecords, adminFilters])

  const totalWorked = useMemo(() => sumWorkedMinutes(filteredAdminRecords), [filteredAdminRecords])
  const myTotalWorked = useMemo(() => sumWorkedMinutes(myHistory), [myHistory])

  return (
    <>
      <PageHeader
        icon="attendance"
        title="Chấm công"
        description="Giờ vào ra, ngày công và lịch sử chấm công của nhân viên."
      />

      <div className="attendance-page">
        {isAdmin && (
          <div className="attendance-tabs" role="tablist" aria-label="Chế độ xem Chấm công">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? 'attendance-tab attendance-tab-active' : 'attendance-tab'}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'me' ? (
          <>
            <Card title="Chấm công hôm nay">
              {loading ? (
                <p className="attendance-state muted">Đang tải trạng thái chấm công…</p>
              ) : (
                <CheckInOutCard
                  record={todayRecord}
                  schedule={schedule}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  busy={busy}
                />
              )}
            </Card>

            <Card
              title="Lịch sử chấm công của tôi"
              action={
                myHistory.length > 0 && (
                  <span className="attendance-total muted">
                    Tổng giờ làm: <strong>{formatMinutes(myTotalWorked)}</strong>
                  </span>
                )
              }
            >
              {loading ? (
                <p className="attendance-state muted">Đang tải lịch sử…</p>
              ) : myHistory.length === 0 ? (
                <p className="attendance-state muted">Chưa có bản ghi chấm công nào.</p>
              ) : (
                <AttendanceHistoryTable records={myHistory} />
              )}
            </Card>
          </>
        ) : (
          <Card
            title="Chấm công toàn công ty"
            action={
              filteredAdminRecords.length > 0 && (
                <span className="attendance-total muted">
                  Tổng giờ làm: <strong>{formatMinutes(totalWorked)}</strong>
                </span>
              )
            }
          >
            <AdminAttendanceFilters filters={adminFilters} onChange={setAdminFilters} />

            <p className="attendance-summary">
              Hiển thị <strong>{filteredAdminRecords.length}</strong> / {allRecords.length} bản ghi
            </p>

            {adminLoading ? (
              <p className="attendance-state muted">Đang tải dữ liệu…</p>
            ) : (
              <AttendanceHistoryTable records={filteredAdminRecords} showEmployee />
            )}
          </Card>
        )}
      </div>
    </>
  )
}
