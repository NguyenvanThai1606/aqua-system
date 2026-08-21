import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import cx from '../utils/cx'
import '../styles/modal.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal dùng chung: render qua portal, khóa cuộn nền,
 * đóng bằng Escape / click nền, và giữ focus bên trong.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
}) {
  const panelRef = useRef(null)
  const lastFocused = useRef(null)

  useEffect(() => {
    if (!open) return

    lastFocused.current = document.activeElement

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    // Đưa focus vào phần tử đầu tiên trong modal.
    const panel = panelRef.current
    const first = panel?.querySelector(FOCUSABLE)
    ;(first ?? panel)?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
        return
      }

      if (event.key !== 'Tab' || !panel) return

      const items = [...panel.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return

      const firstItem = items[0]
      const lastItem = items[items.length - 1]

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      body.style.overflow = previousOverflow
      lastFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        ref={panelRef}
        className={cx('modal', `modal-${size}`)}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
      >
        <header className="modal-header">
          <div>
            {title && <h2 className="modal-title">{title}</h2>}
            {description && <p className="modal-description">{description}</p>}
          </div>
          <button
            type="button"
            className="icon-btn modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="modal-content">{children}</div>

        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
