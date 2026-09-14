/**
 * Hàm thuần dùng chung cho module LỊCH:
 * chuyển đổi ngày/giờ, dựng lưới tháng/tuần, lọc và sắp xếp sự kiện.
 *
 * Cùng nguyên tắc với `utils/taskUtils.js` — đọc chuỗi 'YYYY-MM-DD' theo
 * giờ ĐỊA PHƯƠNG (không dùng `new Date('YYYY-MM-DD')` trực tiếp, tránh lệch
 * múi giờ khi parse chuỗi kiểu ISO UTC).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** 'YYYY-MM-DD' theo giờ địa phương của một đối tượng Date. */
export function toISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Đọc chuỗi 'YYYY-MM-DD' → Date lúc 00:00 giờ địa phương. */
export function parseISODate(value) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(date.getTime())) return null

  return date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
    ? date
    : null
}

export function isValidIsoDate(value) {
  return parseISODate(value) !== null
}

/** 'HH:MM' hợp lệ (00:00 – 23:59). */
export function isValidTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value ?? '')
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function addMonths(date, amount) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + amount)
  return next
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(date) {
  return isSameDay(date, new Date())
}

/** Thứ Hai của tuần chứa `date` (tuần bắt đầu từ Thứ Hai, kiểu Việt Nam). */
export function startOfWeek(date) {
  const day = date.getDay() // 0 = Chủ Nhật … 6 = Thứ Bảy
  const diffToMonday = day === 0 ? -6 : 1 - day
  return startOfDay(addDays(date, diffToMonday))
}

/** 7 ngày (Date) của tuần chứa `date`, bắt đầu từ Thứ Hai. */
export function getWeekDays(date) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

/**
 * Lưới 6 hàng x 7 cột cho chế độ xem Tháng — luôn đủ 42 ô để layout ổn
 * định, bao gồm cả ngày "tràn" từ tháng trước/sau (đánh dấu `inCurrentMonth`).
 */
export function getMonthMatrix(date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = startOfWeek(firstOfMonth)

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = addDays(gridStart, index)
    return {
      date: day,
      iso: toISODate(day),
      inCurrentMonth: day.getMonth() === date.getMonth(),
      isToday: isToday(day),
    }
  })

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

export function formatMonthTitle(date) {
  return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`
}

export function formatWeekTitle(date) {
  const days = getWeekDays(date)
  const first = days[0]
  const last = days[6]
  const sameMonth = first.getMonth() === last.getMonth()

  const pad = (n) => String(n).padStart(2, '0')
  const from = sameMonth ? pad(first.getDate()) : `${pad(first.getDate())}/${pad(first.getMonth() + 1)}`
  const to = `${pad(last.getDate())}/${pad(last.getMonth() + 1)}/${last.getFullYear()}`

  return `${from} – ${to}`
}

export function formatDayTitle(date) {
  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' })
  const rest = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${capitalized}, ${rest}`
}

export function formatShortDate(value) {
  const date = typeof value === 'string' ? parseISODate(value) : value
  if (!date) return ''
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return 'Cả ngày'
  if (!endTime) return startTime
  return `${startTime} – ${endTime}`
}

/** Sự kiện diễn ra đúng ngày `iso`, sắp xếp theo giờ bắt đầu tăng dần. */
export function eventsForDate(events, iso) {
  return events
    .filter((event) => event.date === iso)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
}

export function eventsForRange(events, isoDates) {
  const set = new Set(isoDates)
  return events.filter((event) => set.has(event.date))
}

/** So sánh thời gian bắt đầu < kết thúc — cả hai đều dạng 'HH:MM'. */
export function isValidTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return true
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false
  return startTime <= endTime
}

export function diffInDays(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY)
}
