import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import { useAuth } from '../utils/authContext'
import { useNotifications } from '../utils/notificationsContext'
import { useToast } from '../utils/toastContext'
import useDepartments from '../utils/useDepartments'
import { resolveEmailRecipients } from '../utils/emailRecipientUtils'
import '../styles/email-recipient.css'

const BATCH_SIZE = 25

export default function EmailRecipientDialog({
  open,
  onClose,
  resourceType,
  resource,
  assignedUid,
  profiles = [],
  profilesLoading = false,
}) {
  const { user } = useAuth()
  const { notifyMany } = useNotifications()
  const toast = useToast()
  const { departments, loading: departmentsLoading } = useDepartments(open)
  const [mode, setMode] = useState('assignee')
  const [departmentId, setDepartmentId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setMode('assignee')
    setDepartmentId('')
    setConfirming(false)
    setSending(false)
    setError('')
  }, [open, resource?.id])

  const recipients = useMemo(() => resolveEmailRecipients({
    mode,
    profiles,
    assignedUid,
    departmentId,
    actorUid: user?.uid,
  }), [mode, profiles, assignedUid, departmentId, user?.uid])

  const resourceName = resourceType === 'project' ? resource?.name : resource?.title
  const notificationType = resourceType === 'project' ? 'project_email' : 'task_email'
  const notificationTitle = (resourceType === 'project'
    ? `Thông tin dự án: ${resourceName}`
    : `Thông tin công việc: ${resourceName}`).slice(0, 200)
  const notificationMessage = (resourceType === 'project'
    ? resource?.description || `Thông tin về dự án ${resourceName}.`
    : resource?.description || `Thông tin về công việc ${resourceName}.`).slice(0, 2000)

  const close = useCallback(() => {
    if (sending) return
    onClose()
  }, [sending, onClose])

  const submit = async () => {
    if (!user?.uid || recipients.length === 0 || sending) return
    setSending(true)
    setError('')
    let createdCount = 0

    try {
      for (let start = 0; start < recipients.length; start += BATCH_SIZE) {
        const recipientBatch = recipients.slice(start, start + BATCH_SIZE)
        const created = await notifyMany(recipientBatch.map((recipient) => ({
          userId: recipient.uid,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          relatedType: resourceType,
          relatedId: resource.id,
          actorId: user.uid,
          actorName: user.displayName || user.email || null,
        })))
        createdCount += created.length
      }

      toast.success(`Đã tạo thông báo cho ${createdCount} người nhận`, {
        message: 'Email được xử lý qua hệ thống thông báo hiện tại.',
      })
      onClose()
    } catch (sendError) {
      const detail = sendError instanceof Error ? sendError.message : 'Vui lòng thử lại.'
      const message = createdCount > 0
        ? `Đã tạo thông báo cho ${createdCount}/${recipients.length} người. Một phần còn lại chưa tạo được.`
        : detail
      setError(message)
      toast.error('Không thể hoàn tất gửi thông tin', { message })
    } finally {
      setSending(false)
    }
  }

  const selectionMessage = mode === 'assignee' && !assignedUid
    ? 'Chưa có người đảm nhận hợp lệ cho mục này.'
    : mode === 'department' && !departmentId
      ? 'Hãy chọn bộ phận.'
      : recipients.length === 0
        ? 'Không có người nhận hợp lệ có email (người gửi được loại khỏi danh sách).'
        : ''
  const recipientsLoading = profilesLoading || (mode === 'department' && departmentsLoading)

  if (!resource) return null

  return (
    <Modal
      open={open}
      onClose={close}
      title={confirming ? 'Xác nhận gửi email' : 'Người nhận email'}
      description={confirming
        ? `Bạn đang chuẩn bị gửi email đến ${recipients.length} người. Bạn có chắc chắn muốn gửi?`
        : `Thông tin ${resourceType === 'project' ? 'dự án' : 'công việc'}: ${resourceName}`}
      size="md"
      closeOnOverlay={!sending}
      footer={confirming ? (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={sending}>
            Hủy
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={sending || recipients.length === 0}>
            {sending ? 'Đang gửi…' : `Xác nhận gửi (${recipients.length})`}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={sending}>Đóng</button>
          <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)} disabled={sending || recipientsLoading || recipients.length === 0}>
            <Icon name="send" size={15} /> Tiếp tục
          </button>
        </>
      )}
    >
      {!confirming && (
        <div className="email-recipient-dialog">
          <fieldset className="email-recipient-options">
            <legend className="field-label">Người nhận</legend>
            <label><input type="radio" name="recipient-mode" checked={mode === 'assignee'} onChange={() => setMode('assignee')} /> Người đảm nhận</label>
            <label><input type="radio" name="recipient-mode" checked={mode === 'department'} onChange={() => setMode('department')} /> Bộ phận</label>
            <label><input type="radio" name="recipient-mode" checked={mode === 'all'} onChange={() => setMode('all')} /> Toàn bộ</label>
          </fieldset>

          {mode === 'department' && (
            <label className="field">
              <span className="field-label">Bộ phận</span>
              <select className="select" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={departmentsLoading}>
                <option value="">Chọn bộ phận</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
              {departmentsLoading && <span className="muted">Đang tải bộ phận…</span>}
            </label>
          )}

          {recipientsLoading ? (
            <p className="email-recipient-message muted">Đang tải danh sách người nhận…</p>
          ) : selectionMessage ? (
            <p className="email-recipient-message muted">{selectionMessage}</p>
          ) : (
            <>
              <p className="email-recipient-count">Sẽ gửi đến: <strong>{recipients.length} người</strong></p>
              {recipients.length <= 12 && <ul className="email-recipient-list">{recipients.map((recipient) => <li key={recipient.uid}>{recipient.displayName}</li>)}</ul>}
            </>
          )}
        </div>
      )}
      {confirming && <div className="email-recipient-confirm"><p>{notificationTitle}</p><p className="muted">{recipients.length} địa chỉ email hợp lệ đã được resolve từ hồ sơ AQUA. Người gửi không nằm trong danh sách.</p></div>}
      {error && <p className="email-recipient-error" role="alert">{error}</p>}
    </Modal>
  )
}
