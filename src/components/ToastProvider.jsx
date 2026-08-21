import { useCallback, useMemo, useRef, useState } from 'react'
import { ToastContext } from '../utils/toastContext'
import Icon from './Icon'
import '../styles/toast.css'

const ICON_BY_TYPE = {
  success: 'check',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

const DEFAULT_DURATION = 4000

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))

    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const notify = useCallback(
    ({ title, message, type = 'info', duration = DEFAULT_DURATION }) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, title, message, type }])

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => {
    const shorthand = (type) => (title, options) =>
      notify(
        typeof title === 'string' ? { ...options, title, type } : { ...title, type },
      )

    return {
      notify,
      dismiss,
      success: shorthand('success'),
      error: shorthand('error'),
      warning: shorthand('warning'),
      info: shorthand('info'),
    }
  }, [notify, dismiss])

  return (
    <ToastContext value={value}>
      {children}

      <div className="toast-viewport" role="region" aria-label="Thông báo">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <span className="toast-icon">
              <Icon name={ICON_BY_TYPE[toast.type]} size={18} />
            </span>

            <div className="toast-body">
              {toast.title && <p className="toast-title">{toast.title}</p>}
              {toast.message && <p className="toast-message">{toast.message}</p>}
            </div>

            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Đóng thông báo"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
