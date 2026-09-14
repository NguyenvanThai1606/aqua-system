import { useEffect, useMemo, useState } from 'react'
import Modal from '../Modal'
import Avatar from '../Avatar'
import { DEFAULT_SCOPE, EVENT_SCOPES } from '../../data/calendarMeta'
import { isValidIsoDate, isValidTimeRange } from '../../utils/calendarUtils'
import useUserProfiles from '../../utils/useUserProfiles'
import { toPersonRef } from '../../services/userService'

function emptyForm(dateIso) {
  return {
    title: '',
    date: dateIso ?? '',
    startTime: '08:00',
    endTime: '09:00',
    location: '',
    description: '',
    scope: DEFAULT_SCOPE,
    participantIds: [],
  }
}

/**
 * Form tạo/sửa sự kiện — dùng chung cho cả tạo mới và chỉnh sửa (`event`
 * khác null). `canManageCompanyScope` chỉ true với admin — người dùng
 * thường không thấy lựa chọn "Chung công ty", tránh gửi request bị
 * `firestore.rules` từ chối một cách khó hiểu.
 */
export default function EventFormModal({
  open,
  onClose,
  onSubmit,
  event = null,
  defaultDate,
  canManageCompanyScope = false,
}) {
  const [form, setForm] = useState(() => emptyForm(defaultDate))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const { profiles: users, loading: usersLoading } = useUserProfiles(open)

  useEffect(() => {
    if (!open) return

    if (event) {
      setForm({
        title: event.title ?? '',
        date: event.date ?? '',
        startTime: event.startTime ?? '',
        endTime: event.endTime ?? '',
        location: event.location ?? '',
        description: event.description ?? '',
        scope: event.scope ?? DEFAULT_SCOPE,
        participantIds: [
          ...new Set(
            (Array.isArray(event.participantIds)
              ? event.participantIds
              : (event.participants ?? []).map((person) => person.id)
            ).filter(Boolean),
          ),
        ],
      })
    } else {
      setForm(emptyForm(defaultDate))
    }
    setErrors({})
    setSaving(false)
  }, [open, event, defaultDate])

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const toggleParticipant = (userId) => {
    setForm((current) => ({
      ...current,
      participantIds: current.participantIds.includes(userId)
        ? current.participantIds.filter((id) => id !== userId)
        : [...current.participantIds, userId],
    }))
  }

  const selectedCount = form.participantIds.length

  const validate = () => {
    const next = {}

    if (!form.title.trim()) next.title = 'Tiêu đề không được để trống.'
    if (!isValidIsoDate(form.date)) next.date = 'Vui lòng chọn ngày diễn ra.'
    if (!isValidTimeRange(form.startTime, form.endTime)) {
      next.endTime = 'Giờ kết thúc phải sau giờ bắt đầu.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    if (saving || !validate()) return

    setSaving(true)
    try {
      const participants = form.participantIds
        .map((id) => toPersonRef(users.find((profile) => profile.id === id)))
        .filter(Boolean)

      await onSubmit({
        title: form.title,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location,
        description: form.description,
        scope: canManageCompanyScope ? form.scope : 'personal',
        participants,
      })
    } finally {
      setSaving(false)
    }
  }

  const scopeOptions = useMemo(
    () => (canManageCompanyScope ? EVENT_SCOPES : EVENT_SCOPES.filter((item) => item.id === 'personal')),
    [canManageCompanyScope],
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={event ? 'Sửa sự kiện' : 'Tạo sự kiện'}
      description="Điền thông tin sự kiện rồi lưu để hiển thị trên lịch."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" form="event-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu sự kiện'}
          </button>
        </>
      }
    >
      <form id="event-form" className="event-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="event-title">
            Tiêu đề <span className="task-form-required">*</span>
          </label>
          <input
            id="event-title"
            className="input"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Ví dụ: Họp giao ban tuần"
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <p className="task-form-error">{errors.title}</p>}
        </div>

        <div className="event-form-grid">
          <div className="field">
            <label className="field-label" htmlFor="event-date">
              Ngày <span className="task-form-required">*</span>
            </label>
            <input
              id="event-date"
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
              aria-invalid={Boolean(errors.date)}
            />
            {errors.date && <p className="task-form-error">{errors.date}</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="event-start">
              Giờ bắt đầu
            </label>
            <input
              id="event-start"
              type="time"
              className="input"
              value={form.startTime}
              onChange={(e) => setField('startTime', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="event-end">
              Giờ kết thúc
            </label>
            <input
              id="event-end"
              type="time"
              className="input"
              value={form.endTime}
              onChange={(e) => setField('endTime', e.target.value)}
              aria-invalid={Boolean(errors.endTime)}
            />
            {errors.endTime && <p className="task-form-error">{errors.endTime}</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="event-location">
              Địa điểm
            </label>
            <input
              id="event-location"
              className="input"
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
              placeholder="Phòng họp, link online…"
            />
          </div>
        </div>

        {scopeOptions.length > 1 && (
          <div className="field">
            <label className="field-label" htmlFor="event-scope">
              Phạm vi
            </label>
            <select
              id="event-scope"
              className="select"
              value={form.scope}
              onChange={(e) => setField('scope', e.target.value)}
            >
              {scopeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="event-description">
            Mô tả
          </label>
          <textarea
            id="event-description"
            className="textarea"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Nội dung, chương trình, ghi chú…"
          />
        </div>

        <div className="field">
          <span className="field-label">
            Người tham gia {selectedCount > 0 && `(${selectedCount})`}
          </span>
          {usersLoading ? (
            <p className="event-form-hint muted">Đang tải danh sách người dùng…</p>
          ) : (
            <div className="event-participants" role="group" aria-label="Chọn người tham gia">
              {users.map((profile) => {
                const checked = form.participantIds.includes(profile.id)
                return (
                  <label key={profile.id} className="event-participant-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParticipant(profile.id)}
                    />
                    <Avatar
                      name={profile.displayName}
                      photoURL={profile.photoURL}
                      size="sm"
                    />
                    <span>{profile.displayName || profile.email}</span>
                  </label>
                )
              })}
              {users.length === 0 && <p className="event-form-hint muted">Chưa có người dùng nào.</p>}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
