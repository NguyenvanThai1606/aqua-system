import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Avatar from '../Avatar'
import { EMPLOYMENT_STATUSES, getEmploymentStatusMeta } from '../../data/employeeMeta'
import {
  getDepartmentMembershipPatch,
  getUserDepartmentIds,
} from '../../services/userService'

const ROLE_LABEL = {
  admin: 'Quản trị viên',
  user: 'Thành viên',
}

function displayNameOf(profile) {
  return profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'
}

/**
 * Chi tiết một nhân sự.
 *
 * - Mọi user đã đăng nhập: xem thông tin (chức vụ, phòng ban, trạng thái,
 *   SĐT nếu có) — chỉ đọc.
 * - Admin (`canEdit`): thêm form sửa các field nhân sự — ghi qua
 *   `updatePersonnelProfile()` (xem `pages/NhanSuPage.jsx`). KHÔNG có ô nào
 *   sửa được `role`/`email`/`displayName`/`photoURL` ở đây — những field đó
 *   thuộc phạm vi trang Quản lý người dùng / hồ sơ cá nhân của chính chủ.
 */
export default function PersonnelDetailModal({
  profile,
  open,
  onClose,
  canEdit = false,
  departments,
  departmentsLoading,
  positions = [],
  onSave,
  onRequestDelete,
}) {
  const [form, setForm] = useState({ position: '', departmentIds: [], employmentStatus: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !profile) return
    setForm({
      position: profile.position ?? '',
      departmentIds: getUserDepartmentIds(profile),
      employmentStatus: profile.employmentStatus || 'active',
      phone: profile.phone ?? '',
    })
    setSaving(false)
  }, [open, profile])

  if (!profile) return null

  const status = getEmploymentStatusMeta(profile.employmentStatus)
  const isAdminRole = profile.role === 'admin'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    try {
      await onSave({
        position: form.position,
        ...getDepartmentMembershipPatch(form.departmentIds, departments),
        employmentStatus: form.employmentStatus,
        phone: form.phone,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={displayNameOf(profile)}
      description={profile.email ?? undefined}
      footer={
        canEdit ? (
          <>
            {onRequestDelete && (
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={onRequestDelete}
                disabled={saving}
              >
                Xóa hồ sơ
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Đóng
            </button>
            <button
              type="submit"
              form="personnel-detail-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        )
      }
    >
      <div className="personnel-detail">
        <div className="personnel-detail-identity">
          <Avatar name={displayNameOf(profile)} photoURL={profile.photoURL} size="lg" />
          <div className="personnel-detail-identity-text">
            <p>{displayNameOf(profile)}</p>
            <p className="muted">{profile.email ?? '—'}</p>
          </div>
        </div>

        {!canEdit && (
          <dl className="personnel-detail-meta">
            <div className="personnel-detail-meta-item">
              <dt>Chức vụ</dt>
              <dd>{profile.position || <span className="muted">Chưa cập nhật</span>}</dd>
            </div>
            <div className="personnel-detail-meta-item">
              <dt>Phòng ban</dt>
              <dd>
                {getUserDepartmentIds(profile).length > 0
                  ? getUserDepartmentIds(profile)
                      .map((id) => departments.find((item) => item.id === id)?.name ?? id)
                      .join(', ')
                  : <span className="muted">Chưa phân bổ</span>}
              </dd>
            </div>
            <div className="personnel-detail-meta-item">
              <dt>Trạng thái làm việc</dt>
              <dd>
                <span className={`badge badge-${status.tone}`}>{status.label}</span>
              </dd>
            </div>
            <div className="personnel-detail-meta-item">
              <dt>Điện thoại</dt>
              <dd>{profile.phone || <span className="muted">Chưa cập nhật</span>}</dd>
            </div>
            <div className="personnel-detail-meta-item">
              <dt>Vai trò hệ thống</dt>
              <dd>
                <span className={`badge ${isAdminRole ? 'badge-primary' : 'badge-neutral'}`}>
                  {ROLE_LABEL[profile.role] ?? ROLE_LABEL.user}
                </span>
              </dd>
            </div>
          </dl>
        )}

        {canEdit && (
          <form id="personnel-detail-form" className="personnel-detail-controls" onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="personnel-detail-position">
                Chức vụ
              </label>
              <input
                id="personnel-detail-position"
                type="text"
                className="input"
                list="personnel-detail-position-options"
                value={form.position}
                onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
                placeholder="Ví dụ: Trưởng phòng"
                maxLength={80}
                disabled={saving}
              />
              {/* Phase 15 — gợi ý từ danh mục chức vụ admin quản lý ở trang
                  "Quản lý người dùng" (`positions` collection). Vẫn là
                  `<input>` tự do, KHÔNG ép chọn trong danh sách — cùng
                  nguyên tắc "không bắt buộc nằm trong danh sách có sẵn"
                  đã áp dụng cho trường Khách hàng ở Tạo dự án. */}
              <datalist id="personnel-detail-position-options">
                {positions.map((position) => (
                  <option key={position.id} value={position.name} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <span className="field-label">Phòng ban</span>
              <div className="personnel-department-checkboxes" aria-label="Chọn phòng ban">
                {departmentsLoading ? (
                  <p className="muted">Đang tải danh sách phòng ban…</p>
                ) : departments.length === 0 ? (
                  <p className="muted">Chưa có phòng ban.</p>
                ) : (
                  departments.map((department) => {
                    const checked = form.departmentIds.includes(department.id)
                    return (
                      <label key={department.id} className="personnel-department-checkbox">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              departmentIds: checked
                                ? current.departmentIds.filter((id) => id !== department.id)
                                : [...current.departmentIds, department.id],
                            }))
                          }
                          disabled={saving}
                        />
                        <span>{department.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
              <p className="muted">Có thể chọn nhiều phòng ban.</p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="personnel-detail-status">
                Trạng thái làm việc
              </label>
              <select
                id="personnel-detail-status"
                className="select"
                value={form.employmentStatus}
                onChange={(event) =>
                  setForm((current) => ({ ...current, employmentStatus: event.target.value }))
                }
                disabled={saving}
              >
                {EMPLOYMENT_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="personnel-detail-phone">
                Điện thoại
              </label>
              <input
                id="personnel-detail-phone"
                type="tel"
                className="input"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Ví dụ: 0901 234 567"
                maxLength={30}
                disabled={saving}
              />
            </div>

            <div className="field">
              <span className="field-label">Vai trò hệ thống</span>
              <div>
                <span className={`badge ${isAdminRole ? 'badge-primary' : 'badge-neutral'}`}>
                  {ROLE_LABEL[profile.role] ?? ROLE_LABEL.user}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Đổi vai trò ở trang “Quản lý người dùng”.
              </p>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
