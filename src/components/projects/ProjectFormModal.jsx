import { useEffect, useState } from 'react'
import Modal from '../Modal'
import { DEFAULT_PROJECT_STATUS, PROJECT_STATUSES } from '../../data/projectMeta'
import { isValidDeadline, parseDeadline, toCustomerRef, getDistinctCustomers } from '../../utils/projectUtils'
import useUserProfiles from '../../utils/useUserProfiles'
import { useProjects } from '../../utils/projectsContext'
import { toPersonRef } from '../../services/userService'

const EMPTY_FORM = {
  name: '',
  description: '',
  customerName: '',
  managerId: '',
  status: DEFAULT_PROJECT_STATUS,
  budget: '',
  spent: '0',
  progress: '0',
  startDate: '',
  deadline: '',
}

/** Form tạo dự án mới. Chỉ validate những gì thật sự cần chặn. */
export default function ProjectFormModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const { profiles: users, loading: usersLoading } = useUserProfiles(open)
  const { projects } = useProjects()
  const existingCustomers = getDistinctCustomers(projects)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
    setErrors({})
    setSaving(false)
  }, [open])

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const validateDateField = (value, fieldName, label) => {
    if (!isValidDeadline(value)) {
      return `${label} không hợp lệ.`
    }
    if (value) {
      const date = parseDeadline(value)
      if (date.getFullYear() < 2000 || date.getFullYear() > 2100) {
        return `${label} phải nằm trong khoảng năm 2000–2100.`
      }
    }
    return undefined
  }

  const validate = () => {
    const next = {}

    if (!form.name.trim()) {
      next.name = 'Tên dự án không được để trống.'
    }

    const startError = validateDateField(form.startDate, 'startDate', 'Ngày bắt đầu')
    if (startError) next.startDate = startError

    const deadlineError = validateDateField(form.deadline, 'deadline', 'Deadline')
    if (deadlineError) next.deadline = deadlineError

    if (form.startDate && form.deadline) {
      const start = parseDeadline(form.startDate)
      const end = parseDeadline(form.deadline)
      if (start && end && start > end) {
        next.deadline = 'Deadline phải sau ngày bắt đầu.'
      }
    }

    const budget = Number(form.budget)
    if (form.budget !== '' && (!Number.isFinite(budget) || budget < 0)) {
      next.budget = 'Ngân sách phải là số không âm.'
    }

    const spent = Number(form.spent)
    if (form.spent !== '' && (!Number.isFinite(spent) || spent < 0)) {
      next.spent = 'Chi phí đã dùng phải là số không âm.'
    }

    const progress = Number(form.progress)
    if (form.progress !== '' && (!Number.isFinite(progress) || progress < 0 || progress > 100)) {
      next.progress = 'Tiến độ phải nằm trong khoảng 0–100.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving || !validate()) return

    setSaving(true)
    try {
      await onSubmit({
        name: form.name,
        description: form.description,
        status: form.status,
        customer: toCustomerRef(form.customerName),
        manager: form.managerId
          ? toPersonRef(users.find((profile) => profile.id === form.managerId))
          : null,
        budget: form.budget === '' ? 0 : form.budget,
        spent: form.spent === '' ? 0 : form.spent,
        progress: form.progress === '' ? 0 : form.progress,
        startDate: form.startDate,
        deadline: form.deadline,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Tạo dự án"
      description="Điền thông tin dự án rồi lưu để thêm vào danh sách."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" form="project-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu dự án'}
          </button>
        </>
      }
    >
      <form id="project-form" className="project-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="project-form-name">
            Tên dự án <span className="project-form-required">*</span>
          </label>
          <input
            id="project-form-name"
            className="input"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="Ví dụ: Cổng thông tin nội bộ"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className="project-form-error">{errors.name}</p>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="project-form-description">
            Mô tả
          </label>
          <textarea
            id="project-form-description"
            className="textarea"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            placeholder="Mô tả ngắn gọn phạm vi dự án…"
          />
        </div>

        <div className="project-form-grid">
          <div className="field">
            <label className="field-label" htmlFor="project-form-customer">
              Khách hàng
            </label>
            <input
              id="project-form-customer"
              type="text"
              className="input"
              list="project-form-customer-options"
              value={form.customerName}
              onChange={(event) => setField('customerName', event.target.value)}
              placeholder="Tên khách hàng bất kỳ — có thể tự nhập"
              maxLength={200}
            />
            {/* Không bắt buộc chọn trong danh sách — gợi ý lấy từ khách
                hàng ĐÃ TỪNG xuất hiện ở các dự án khác (xem
                `getDistinctCustomers`), không seed danh mục cố định. */}
            <datalist id="project-form-customer-options">
              {existingCustomers.map((customer) => (
                <option key={customer.id} value={customer.name} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="project-form-manager">
              Người phụ trách
            </label>
            <select
              id="project-form-manager"
              className="select"
              value={form.managerId}
              onChange={(event) => setField('managerId', event.target.value)}
              disabled={usersLoading}
            >
              <option value="">Chưa phân công</option>
              {users.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName || profile.email}
                  {profile.email ? ` (${profile.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="project-form-status">
              Trạng thái
            </label>
            <select
              id="project-form-status"
              className="select"
              value={form.status}
              onChange={(event) => setField('status', event.target.value)}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="project-form-progress">
              Tiến độ (%)
            </label>
            <input
              id="project-form-progress"
              type="number"
              min="0"
              max="100"
              className="input"
              value={form.progress}
              onChange={(event) => setField('progress', event.target.value)}
              aria-invalid={Boolean(errors.progress)}
            />
            {errors.progress && <p className="project-form-error">{errors.progress}</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="project-form-budget">
              Ngân sách (VNĐ)
            </label>
            <input
              id="project-form-budget"
              type="number"
              min="0"
              step="1000000"
              className="input"
              value={form.budget}
              onChange={(event) => setField('budget', event.target.value)}
              placeholder="0"
              aria-invalid={Boolean(errors.budget)}
            />
            {errors.budget && <p className="project-form-error">{errors.budget}</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="project-form-spent">
              Đã chi (VNĐ)
            </label>
            <input
              id="project-form-spent"
              type="number"
              min="0"
              step="1000000"
              className="input"
              value={form.spent}
              onChange={(event) => setField('spent', event.target.value)}
              aria-invalid={Boolean(errors.spent)}
            />
            {errors.spent && <p className="project-form-error">{errors.spent}</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="project-form-start">
              Ngày bắt đầu
            </label>
            <input
              id="project-form-start"
              type="date"
              className="input"
              value={form.startDate}
              onChange={(event) => setField('startDate', event.target.value)}
              aria-invalid={Boolean(errors.startDate)}
            />
            {errors.startDate && <p className="project-form-error">{errors.startDate}</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="project-form-deadline">
              Deadline
            </label>
            <input
              id="project-form-deadline"
              type="date"
              className="input"
              value={form.deadline}
              onChange={(event) => setField('deadline', event.target.value)}
              aria-invalid={Boolean(errors.deadline)}
            />
            {errors.deadline && <p className="project-form-error">{errors.deadline}</p>}
          </div>
        </div>
      </form>
    </Modal>
  )
}
