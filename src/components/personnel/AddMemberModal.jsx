import { useEffect, useMemo, useState } from 'react'
import Modal from '../Modal'
import Avatar from '../Avatar'

function displayNameOf(profile) {
  return profile.displayName?.trim() || profile.email?.split('@')[0] || 'Người dùng'
}

/**
 * Modal "Thêm nhân sự" mở trực tiếp từ card phòng ban ở tab Cơ cấu tổ
 * chức (Phase 14 — trước đây chỉ gán được `departmentId` gián tiếp qua
 * `PersonnelDetailModal` ở tab Danh sách nhân sự, khiến admin không thấy
 * đường nào "thêm nhân sự" ngay tại Cơ cấu tổ chức).
 *
 * Chỉ liệt kê user CHƯA thuộc phòng ban này (đã ở phòng ban khác thì
 * chọn ở đây sẽ CHUYỂN người đó sang phòng ban hiện tại — không tạo quan
 * hệ nhiều-phòng-ban vì `User.departmentId` vẫn là field đơn, giữ đúng
 * schema hiện tại). Ghi qua `updatePersonnelProfile()` — cùng hàm/Rules
 * đã có sẵn ở Phase 10, không thêm field hay nhánh Rules mới.
 */
export default function AddMemberModal({ open, onClose, department, profiles, onAdd }) {
  const [query, setQuery] = useState('')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSavingId(null)
  }, [open])

  const candidates = useMemo(() => {
    if (!department) return []
    const term = query.trim().toLowerCase()
    return profiles
      .filter((profile) => profile.departmentId !== department.id)
      .filter((profile) => {
        if (!term) return true
        const name = displayNameOf(profile).toLowerCase()
        const email = (profile.email ?? '').toLowerCase()
        return name.includes(term) || email.includes(term)
      })
  }, [profiles, department, query])

  if (!department) return null

  const handlePick = async (profile) => {
    if (savingId) return
    setSavingId(profile.id)
    try {
      await onAdd(profile, department)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Thêm nhân sự"
      description={`Chọn người để thêm vào phòng ban “${department.name}”.`}
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="personnel-add-member">
        <input
          type="text"
          className="input"
          placeholder="Tìm theo tên hoặc email…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />

        <div className="personnel-add-member-list">
          {candidates.length === 0 ? (
            <p className="personnel-state muted">
              {query
                ? 'Không tìm thấy nhân sự phù hợp.'
                : 'Mọi nhân sự đều đã thuộc phòng ban này.'}
            </p>
          ) : (
            candidates.map((profile) => (
              <button
                type="button"
                key={profile.id}
                className="personnel-add-member-row"
                onClick={() => handlePick(profile)}
                disabled={Boolean(savingId)}
              >
                <Avatar name={displayNameOf(profile)} photoURL={profile.photoURL} size="sm" />
                <span className="personnel-add-member-text">
                  <span className="personnel-add-member-name">{displayNameOf(profile)}</span>
                  <span className="personnel-add-member-meta">
                    {profile.email ?? '—'}
                    {profile.departmentName ? ` · Đang ở: ${profile.departmentName}` : ''}
                  </span>
                </span>
                <span className="personnel-add-member-action">
                  {savingId === profile.id ? 'Đang thêm…' : 'Thêm'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
