import { useEffect, useState } from 'react'
import Modal from '../Modal'

const EMPTY_FORM = { name: '', description: '', managerId: '' }

function displayNameOf(profile) {
  return profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'
}

/**
 * Form tạo/sửa phòng ban (admin). `department` có giá trị → chế độ sửa,
 * ngược lại là tạo mới. `managerId` liên kết tới Firebase Auth uid thật lấy
 * từ `useUserProfiles()` — không có ô nhập tay tên trưởng phòng.
 */
export default function DepartmentFormModal({ open, onClose, onSubmit, department, profiles, profilesLoading }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(department)

  useEffect(() => {
    if (!open) return
    setForm({
      name: department?.name ?? '',
      description: department?.description ?? '',
      managerId: department?.managerId ?? '',
    })
    setError(null)
    setSaving(false)
  }, [open, department])

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return

    if (!form.name.trim()) {
      setError('Tên phòng ban không được để trống.')
      return
    }

    const manager = form.managerId ? profiles.find((profile) => profile.id === form.managerId) : null

    setSaving(true)
    try {
      await onSubmit({
        name: form.name,
        description: form.description,
        managerId: manager?.id ?? null,
        managerName: manager ? displayNameOf(manager) : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa phòng ban' : 'Thêm phòng ban'}
      description={isEdit ? department.name : 'Điền thông tin phòng ban rồi lưu.'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button type="submit" form="department-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu phòng ban'}
          </button>
        </>
      }
    >
      <form id="department-form" className="personnel-department-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="department-form-name">
            Tên phòng ban <span className="personnel-form-required">*</span>
          </label>
          <input
            id="department-form-name"
            className="input"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="Ví dụ: Phòng Kỹ thuật"
            maxLength={80}
            disabled={saving}
          />
          {error && <p className="personnel-form-error">{error}</p>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="department-form-description">
            Mô tả
          </label>
          <textarea
            id="department-form-description"
            className="input"
            rows={3}
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            placeholder="Chức năng, phạm vi công việc của phòng ban…"
            maxLength={400}
            disabled={saving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="department-form-manager">
            Trưởng phòng
          </label>
          <select
            id="department-form-manager"
            className="select"
            value={form.managerId}
            onChange={(event) => setField('managerId', event.target.value)}
            disabled={saving || profilesLoading}
          >
            <option value="">Chưa chọn</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {displayNameOf(profile)}
                {profile.email ? ` (${profile.email})` : ''}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  )
}
