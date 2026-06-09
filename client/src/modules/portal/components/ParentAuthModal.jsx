import { useEffect, useState } from 'react'
import { LogIn, UserPlus, X } from 'lucide-react'
import { request } from '../../../services/api'

const blankForm = {
  fullName: '',
  email: '',
  phone: '',
  emailOrPhone: '',
  password: '',
}

export default function ParentAuthModal({ open, onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(blankForm)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const data = mode === 'login'
        ? await request('post', '/auth/customer/login', {
          emailOrPhone: form.emailOrPhone.trim(),
          password: form.password,
        })
        : await request('post', '/auth/customer/register', {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        })

      onAuthenticated(data)
      setForm(blankForm)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="auth-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button auth-close" type="button" aria-label="Đóng" onClick={onClose}>
          <X size={20} />
        </button>

        <p className="eyebrow">Tài khoản phụ huynh</p>
        <h2>{mode === 'login' ? 'Đăng nhập phụ huynh' : 'Tạo tài khoản phụ huynh'}</h2>

        <div className="auth-tabs" role="tablist" aria-label="Chọn chế độ đăng nhập">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            onClick={() => {
              setMode('login')
              setMessage('')
            }}
          >
            <LogIn size={16} /> Đăng nhập
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            onClick={() => {
              setMode('register')
              setMessage('')
            }}
          >
            <UserPlus size={16} /> Tạo tài khoản
          </button>
        </div>

        {message && <p className="notice">{message}</p>}

        {mode === 'register' ? (
          <>
            <label>Họ tên phụ huynh
              <input name="fullName" value={form.fullName} onChange={updateField} required />
            </label>
            <label>Email
              <input name="email" type="email" value={form.email} onChange={updateField} required />
            </label>
            <label>Số điện thoại
              <input name="phone" value={form.phone} onChange={updateField} required />
            </label>
          </>
        ) : (
          <label>Email hoặc số điện thoại
            <input name="emailOrPhone" value={form.emailOrPhone} onChange={updateField} required />
          </label>
        )}

        <label>Mật khẩu
          <input name="password" type="password" value={form.password} onChange={updateField} required />
        </label>

        <button className="primary-button full" type="submit" disabled={loading}>
          {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
          {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </form>
    </div>
  )
}
