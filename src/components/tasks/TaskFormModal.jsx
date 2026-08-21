import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Icon from '../Icon'
import {
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../../data/taskMeta'
import { isValidDeadline, parseDeadline } from '../../utils/taskUtils'
import useUserProfiles from '../../utils/useUserProfiles'
import { toPersonRef } from '../../services/userService'

const EMPTY_FORM = {
  title: '',
  description: '',
  assigneeId: '',
  deadline: '',
  priority: DEFAULT_PRIORITY,
  status: DEFAULT_STATUS,
}

let draftItemId = 0

/** Form tạo công việc mới. Chỉ validate những gì thật sự cần chặn. */
export default function TaskFormModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [checklist, setChecklist] = useState([])
  const [draft, setDraft] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const { profiles: users, loading: usersLoading } = useUserProfiles(open)

  // Mở lại form là làm mới toàn bộ, không giữ dữ liệu lần trước.
  useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
    setChecklist([])
    setDraft('')
    setErrors({})
    setSaving(false)
  }, [open])

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const addChecklistItem = () => {
    const title = draft.trim()
    if (!title) return

    draftItemId += 1
    setChecklist((current) => [...current, { id: `draft-${draftItemId}`, title, completed: false }])
    setDraft('')
  }

  const validate = () => {
    const next = {}

    if (!form.title.trim()) {
      next.title = 'Tên công việc không được để trống.'
    }

    if (!isValidDeadline(form.deadline)) {
      next.deadline = 'Deadline không hợp lệ.'
    } else if (form.deadline) {
      const date = parseDeadline(form.deadline)
      if (date.getFullYear() < 2000 || date.getFullYear() > 2100) {
        next.deadline = 'Deadline phải nằm trong khoảng năm 2000–2100.'
      }
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
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        assignee: form.assigneeId
          ? toPersonRef(users.find((profile) => profile.id === form.assigneeId))
          : null,
        deadline: form.deadline,
        checklist,
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
      title="Tạo công việc"
      description="Điền thông tin đầu việc rồi lưu để đưa lên bảng Kanban."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" form="task-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu công việc'}
          </button>
        </>
      }
    >
      <form id="task-form" className="task-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="form-title">
            Tên công việc <span className="task-form-required">*</span>
          </label>
          <input
            id="form-title"
            className="input"
            value={form.title}
            onChange={(event) => setField('title', event.target.value)}
            placeholder="Ví dụ: Chuẩn bị báo cáo tuần"
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <p className="task-form-error">{errors.title}</p>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="form-description">
            Mô tả
          </label>
          <textarea
            id="form-description"
            className="textarea"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            placeholder="Mô tả ngắn gọn phạm vi công việc…"
          />
        </div>

        <div className="task-form-grid">
          <div className="field">
            <label className="field-label" htmlFor="form-assignee">
              Người phụ trách
            </label>
            <select
              id="form-assignee"
              className="select"
              value={form.assigneeId}
              onChange={(event) => setField('assigneeId', event.target.value)}
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
            <label className="field-label" htmlFor="form-deadline">
              Deadline
            </label>
            <input
              id="form-deadline"
              type="date"
              className="input"
              value={form.deadline}
              onChange={(event) => setField('deadline', event.target.value)}
              aria-invalid={Boolean(errors.deadline)}
            />
            {errors.deadline && <p className="task-form-error">{errors.deadline}</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="form-priority">
              Mức ưu tiên
            </label>
            <select
              id="form-priority"
              className="select"
              value={form.priority}
              onChange={(event) => setField('priority', event.target.value)}
            >
              {TASK_PRIORITIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="form-status">
              Trạng thái
            </label>
            <select
              id="form-status"
              className="select"
              value={form.status}
              onChange={(event) => setField('status', event.target.value)}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Checklist ban đầu</span>

          {checklist.length > 0 && (
            <ul className="task-form-checklist">
              {checklist.map((item) => (
                <li key={item.id}>
                  <span>{item.title}</span>
                  <button
                    type="button"
                    className="task-form-remove"
                    onClick={() =>
                      setChecklist((current) => current.filter((row) => row.id !== item.id))
                    }
                    aria-label={`Bỏ mục ${item.title}`}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="task-form-add">
            <input
              className="input"
              value={draft}
              placeholder="Thêm một đầu mục…"
              aria-label="Nội dung mục checklist"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addChecklistItem()
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addChecklistItem}
              disabled={!draft.trim()}
            >
              Thêm
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
