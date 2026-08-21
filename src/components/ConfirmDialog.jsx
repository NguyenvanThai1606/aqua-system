import Modal from './Modal'

/** Hộp thoại xác nhận cho các hành động không hoàn tác được. */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  tone = 'danger',
  busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      closeOnOverlay={!busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className={`btn btn-${tone}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
