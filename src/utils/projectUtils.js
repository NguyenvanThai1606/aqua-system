/**
 * Hàm thuần dùng chung cho module dự án:
 * tính quá hạn, định dạng tiền, tỉ lệ ngân sách, lọc và sắp xếp.
 *
 * Phần xử lý ngày dùng lại `taskUtils` để cả hai module hiểu
 * chuỗi 'YYYY-MM-DD' theo cùng một cách.
 */

import { isClosedStatus } from '../data/projectMeta'
import { parseDeadline, startOfToday } from './taskUtils'

export { parseDeadline, isValidDeadline } from './taskUtils'

/** Dự án đã đóng (hoàn thành/hủy) thì không tính quá hạn. */
export function isProjectOverdue(project) {
  if (isClosedStatus(project.status)) return false

  const deadline = parseDeadline(project.deadline)
  return deadline !== null && deadline < startOfToday()
}

export function countOverdueProjects(projects) {
  return projects.reduce((total, project) => total + (isProjectOverdue(project) ? 1 : 0), 0)
}

/** Số ngày còn lại tới deadline (âm là đã quá hạn), null nếu không có deadline. */
export function daysUntilDeadline(project) {
  const deadline = parseDeadline(project.deadline)
  if (!deadline) return null

  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return Math.round((deadline - startOfToday()) / MS_PER_DAY)
}

export function formatDate(value) {
  const date = parseDeadline(value)
  if (!date) return 'Chưa đặt'

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Tiền tệ VNĐ dạng đầy đủ: 850.000.000 ₫ */
export function formatCurrency(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0 ₫'

  return amount.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
}

/** Dạng rút gọn cho thẻ hẹp: 850 triệu / 2,4 tỉ */
export function formatCompactCurrency(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0 ₫'
  if (amount === 0) return '0 ₫'

  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỉ ₫`
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} triệu ₫`
  }
  return formatCurrency(amount)
}

/**
 * Tỉ lệ ngân sách đã dùng.
 * `over` = chi vượt ngân sách, `warning` = đã dùng trên 85%.
 */
export function getBudgetUsage(project) {
  const budget = Number(project.budget) || 0
  const spent = Number(project.spent) || 0
  const percent = budget === 0 ? 0 : Math.round((spent / budget) * 100)

  return {
    budget,
    spent,
    percent,
    remaining: budget - spent,
    over: budget > 0 && spent > budget,
    warning: budget > 0 && spent <= budget && percent >= 85,
  }
}

/**
 * Chuẩn hóa tên khách hàng người dùng tự nhập thành `{ id, name }` để lưu
 * vào `Project.customer` — `id` dùng chính tên đã trim làm khóa (không cần
 * một hệ id riêng vì khách hàng không phải collection độc lập, xem
 * `getDistinctCustomers` ở trên). Trả về `null` nếu bỏ trống ("Chưa có
 * khách hàng").
 */
export function toCustomerRef(name) {
  const trimmed = name?.trim()
  if (!trimmed) return null
  return { id: trimmed, name: trimmed }
}

/**
 * Danh sách khách hàng duy nhất đang thật sự xuất hiện trong dữ liệu dự án
 * hiện có — dùng làm gợi ý ở ô "Khách hàng" (Tạo/Sửa dự án) và bộ lọc.
 *
 * [Phase 15] Thay thế hoàn toàn `data/customers.js` (8 khách hàng mẫu cố
 * định) — khách hàng giờ là TRƯỜNG TỰ DO trên `Project.customer`
 * (`{ id, name }`, `id` = chính `name` đã chuẩn hóa, xem
 * `projectService.js#toCustomerRef`), không còn danh mục bắt buộc chọn.
 * Gợi ý ở đây tự sinh ra từ các khách hàng ĐÃ TỪNG được nhập, không seed gì
 * thêm — dự án đầu tiên của một khách hàng mới sẽ không có gợi ý, đúng kỳ
 * vọng "không bắt buộc nằm trong danh sách có sẵn".
 */
export function getDistinctCustomers(projects) {
  const map = new Map()
  projects.forEach((project) => {
    const customer = project.customer
    if (customer?.id && !map.has(customer.id)) {
      map.set(customer.id, customer)
    }
  })
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

/** Áp dụng đồng thời mọi bộ lọc — điều kiện rỗng nghĩa là không lọc. */
export function filterProjects(
  projects,
  { keyword = '', status = 'all', customer = 'all', manager = 'all' } = {},
) {
  const needle = keyword.trim().toLowerCase()

  return projects.filter((project) => {
    if (status !== 'all' && project.status !== status) return false

    if (customer !== 'all') {
      const customerId = project.customer?.id ?? 'none'
      if (customerId !== customer) return false
    }

    if (manager !== 'all') {
      const managerId = project.manager?.id ?? 'unassigned'
      if (managerId !== manager) return false
    }

    if (needle) {
      const haystack =
        `${project.name} ${project.description} ${project.customer?.name ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }

    return true
  })
}

/** Dự án quá hạn lên trước, rồi tới deadline gần nhất, cuối cùng theo tên. */
export function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    const overdueDiff = Number(isProjectOverdue(b)) - Number(isProjectOverdue(a))
    if (overdueDiff !== 0) return overdueDiff

    const aDeadline = parseDeadline(a.deadline)
    const bDeadline = parseDeadline(b.deadline)
    if (aDeadline && bDeadline && aDeadline - bDeadline !== 0) return aDeadline - bDeadline
    if (aDeadline && !bDeadline) return -1
    if (!aDeadline && bDeadline) return 1

    return a.name.localeCompare(b.name, 'vi')
  })
}
