import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../utils/authContext'
import { getAuthErrorMessage } from '../../utils/authErrors'
import Icon from '../Icon'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const COPY = {
  login: {
    title: 'Đăng nhập',
    subtitle: 'Chào mừng quay lại AQUA.',
    submit: 'Đăng nhập',
    submitting: 'Đang đăng nhập…',
    switchText: 'Chưa có tài khoản?',
    switchLinkText: 'Đăng ký ngay',
    switchTo: '/register',
  },
  register: {
    title: 'Đăng ký',
    subtitle: 'Tạo tài khoản để bắt đầu sử dụng AQUA.',
    submit: 'Đăng ký',
    submitting: 'Đang đăng ký…',
    switchText: 'Đã có tài khoản?',
    switchLinkText: 'Đăng nhập',
    switchTo: '/login',
  },
}

/**
 * Form Đăng nhập / Đăng ký dùng chung.
 * Chỉ giao tiếp với Firebase thông qua `useAuth()` (login/register) —
 * không import hay gọi trực tiếp Firebase Auth SDK ở đây.
 */
export default function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const copy = COPY[mode]

  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const errors = {}

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email.'
    } else if (!EMAIL_RE.test(email.trim())) {
      errors.email = 'Email không hợp lệ.'
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.'
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu tối thiểu 6 ký tự.'
    }

    if (isRegister) {
      if (!confirmPassword) {
        errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
      } else if (confirmPassword !== password) {
        errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!validate()) return

    setSubmitting(true)
    try {
      if (isRegister) {
        await register(email.trim(), password)
      } else {
        await login(email.trim(), password)
      }
      navigate('/', { replace: true })
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form-head">
        <h1 className="auth-form-title">{copy.title}</h1>
        <p className="auth-form-subtitle">{copy.subtitle}</p>
      </div>

      {formError && (
        <div className="auth-alert" role="alert">
          <Icon name="error" size={17} />
          <span>{formError}</span>
        </div>
      )}

      <div className="auth-fields">
        <div className="field">
          <label className="field-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className={`input${fieldErrors.email ? ' auth-input-error' : ''}`}
            placeholder="ban@congty.com"
            autoComplete="email"
            value={email}
            disabled={submitting}
            onChange={(event) => setEmail(event.target.value)}
          />
          {fieldErrors.email && <p className="auth-field-error">{fieldErrors.email}</p>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="auth-password">
            Mật khẩu
          </label>
          <input
            id="auth-password"
            type="password"
            className={`input${fieldErrors.password ? ' auth-input-error' : ''}`}
            placeholder="Tối thiểu 6 ký tự"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            disabled={submitting}
            onChange={(event) => setPassword(event.target.value)}
          />
          {fieldErrors.password && (
            <p className="auth-field-error">{fieldErrors.password}</p>
          )}
        </div>

        {isRegister && (
          <div className="field">
            <label className="field-label" htmlFor="auth-confirm-password">
              Xác nhận mật khẩu
            </label>
            <input
              id="auth-confirm-password"
              type="password"
              className={`input${
                fieldErrors.confirmPassword ? ' auth-input-error' : ''
              }`}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              value={confirmPassword}
              disabled={submitting}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {fieldErrors.confirmPassword && (
              <p className="auth-field-error">{fieldErrors.confirmPassword}</p>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary auth-submit"
        disabled={submitting}
      >
        {submitting && <span className="auth-spinner" aria-hidden="true" />}
        {submitting ? copy.submitting : copy.submit}
      </button>

      <p className="auth-switch">
        {copy.switchText} <Link to={copy.switchTo}>{copy.switchLinkText}</Link>
      </p>
    </form>
  )
}
