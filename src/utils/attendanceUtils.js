/**
 * Hàm thuần dùng chung cho module CHẤM CÔNG (Phase 11).
 *
 * Liên kết Lịch ↔ Chấm công nằm ở `getWorkScheduleForDate()`: nếu người
 * dùng có một sự kiện lịch vào đúng ngày chấm công (sự kiện chung công ty,
 * hoặc sự kiện cá nhân họ tạo/được mời), giờ bắt đầu/kết thúc SỚM NHẤT của
 * sự kiện đó được dùng làm khung giờ làm việc để tính đi muộn/về sớm — thay
 * cho khung giờ mặc định `DEFAULT_WORK_SCHEDULE` (`data/attendanceMeta.js`).
 */

import { DEFAULT_WORK_SCHEDULE } from '../data/attendanceMeta'
import { isValidTime } from './calendarUtils'

/** 'HH:MM' của một thời điểm ISO, theo giờ địa phương. */
export function formatClock(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** So khớp 'HH:MM' hiện tại của một thời điểm ISO với ngưỡng 'HH:MM'. */
export function timeStringOf(iso) {
  return formatClock(iso)
}

/** Số phút chênh lệch giữa 'HH:MM' thực tế và 'HH:MM' mốc — dương nếu trễ hơn mốc. */
export function minutesDiff(actualHHMM, referenceHHMM) {
  const [ah, am] = actualHHMM.split(':').map(Number)
  const [rh, rm] = referenceHHMM.split(':').map(Number)
  return ah * 60 + am - (rh * 60 + rm)
}

export function formatMinutes(minutes) {
  const value = Math.max(0, Math.round(minutes))
  if (value === 0) return '0 phút'

  const hours = Math.floor(value / 60)
  const mins = value % 60

  if (hours === 0) return `${mins} phút`
  if (mins === 0) return `${hours} giờ`
  return `${hours} giờ ${mins} phút`
}

/** Tổng thời gian làm việc thực tế giữa hai mốc ISO — null nếu thiếu mốc nào. */
export function workedMinutesBetween(checkInAt, checkOutAt) {
  if (!checkInAt || !checkOutAt) return null
  const diffMs = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return null
  return Math.round(diffMs / 60000)
}

export function formatWorkedDuration(checkInAt, checkOutAt) {
  const minutes = workedMinutesBetween(checkInAt, checkOutAt)
  return minutes === null ? '—' : formatMinutes(minutes)
}

/**
 * Khung giờ làm việc áp dụng cho một user vào một ngày cụ thể — ưu tiên sự
 * kiện lịch, không có thì dùng mặc định. Trả về thêm nguồn (`source`) và
 * tên sự kiện (nếu có) để hiển thị chú thích ở UI (vd. "Theo lịch: Ca sáng").
 *
 * @param {Array} events Danh sách sự kiện từ `EventsProvider`.
 * @param {string} dateIso Ngày chấm công 'YYYY-MM-DD'.
 * @param {string} uid uid của người chấm công.
 */
export function getWorkScheduleForDate(events, dateIso, uid) {
  const candidates = (events ?? []).filter((event) => {
    if (event.date !== dateIso) return false
    if (!isValidTime(event.startTime) || !isValidTime(event.endTime)) return false

    const isCompany = event.scope === 'company'
    const isOwner = event.ownerId === uid
    const isParticipant = (event.participants ?? []).some((person) => person.id === uid)
    return isCompany || isOwner || isParticipant
  })

  if (candidates.length === 0) {
    return { ...DEFAULT_WORK_SCHEDULE, source: 'default', eventTitle: null }
  }

  const earliest = [...candidates].sort((a, b) => a.startTime.localeCompare(b.startTime))[0]
  return {
    start: earliest.startTime,
    end: earliest.endTime,
    source: 'calendar',
    eventTitle: earliest.title,
  }
}

/**
 * Trạng thái CHẤM CÔNG VÀO so với khung giờ làm việc.
 * @returns {{ status: 'on_time'|'late', lateMinutes: number }}
 */
export function evaluateCheckIn(checkInAt, scheduleStart) {
  const actual = timeStringOf(checkInAt)
  const diff = minutesDiff(actual, scheduleStart)
  return diff > 0 ? { status: 'late', lateMinutes: diff } : { status: 'on_time', lateMinutes: 0 }
}

/**
 * Trạng thái CHẤM CÔNG RA so với khung giờ làm việc.
 * @returns {{ status: 'on_time'|'early', earlyMinutes: number }}
 */
export function evaluateCheckOut(checkOutAt, scheduleEnd) {
  const actual = timeStringOf(checkOutAt)
  const diff = minutesDiff(scheduleEnd, actual)
  return diff > 0 ? { status: 'early', earlyMinutes: diff } : { status: 'on_time', earlyMinutes: 0 }
}

/** Trạng thái tổng quan của MỘT bản ghi ngày công. */
export function dayStatusOf(record) {
  if (!record || !record.checkInAt) return 'not_checked_in'
  if (!record.checkOutAt) return 'checked_in'
  return 'completed'
}

/** Tổng số phút làm việc của một danh sách bản ghi (bỏ qua bản ghi chưa checkout). */
export function sumWorkedMinutes(records) {
  return records.reduce((total, record) => {
    const minutes = workedMinutesBetween(record.checkInAt, record.checkOutAt)
    return total + (minutes ?? 0)
  }, 0)
}
