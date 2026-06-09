import { useEffect, useMemo, useState } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Ticketing from './modules/cashier/pages/Ticketing'
import ServicePOS from './modules/cashier/pages/ServicePOS'
import VipManager from './modules/cashier/pages/VipManager'
import EventCampaigns from './modules/event/pages/EventCampaigns'
import BookingsList from './modules/event/pages/BookingsList'
import GamesManager from './modules/facility/pages/GamesManager'
import Services from './modules/facility/pages/Services'
import CustomerFacilities from './modules/portal/pages/CustomerFacilities'
import EventDetail from './modules/portal/pages/EventDetail'
import HomePage from './modules/portal/pages/HomePage'
import ServiceProducts from './modules/portal/pages/ServiceProducts'
import VipMembership from './modules/portal/pages/VipMembership'
import ReportDashboard from './modules/report/pages/ReportDashboard'
import { request } from './services/api'

const staffViews = [
  { id: 'ticketing', label: 'Thu ngân', roles: ['Manager', 'Cashier'], component: Ticketing },
  { id: 'service-pos', label: 'Thanh toán', roles: ['Manager', 'Cashier'], component: ServicePOS },
  { id: 'vip', label: 'Khách hàng VIP', roles: ['Manager', 'Cashier'], component: VipManager },
  { id: 'bookings', label: 'Booking', roles: ['Manager', 'Cashier'], component: BookingsList },
  { id: 'facilities', label: 'Khu vui chơi', roles: ['Manager'], component: GamesManager },
  { id: 'services', label: 'Dịch vụ tính phí', roles: ['Manager'], component: Services },
  { id: 'events', label: 'Sự kiện', roles: ['Manager'], component: EventCampaigns },
  { id: 'reports', label: 'Báo cáo & Thống kê', roles: ['Manager'], component: ReportDashboard },
]

function getStaffViews(session) {
  if (session.user.role === 'Manager') return staffViews

  const assignment = session.user.assignment
  if (assignment?.areaType === 'Gate') {
    return [
      { id: 'ticketing', label: 'Thu vé vào cổng', roles: ['Cashier'], component: Ticketing },
    ]
  }

  if (assignment?.areaType === 'Facility') {
    return [
      { id: 'facilities', label: 'Khu của tôi', roles: ['Cashier'], component: GamesManager },
      { id: 'services', label: 'Dịch vụ tính phí', roles: ['Cashier'], component: Services },
      { id: 'service-pos', label: 'Thanh toán', roles: ['Cashier'], component: ServicePOS },
    ]
  }

  return []
}

const blankLoginForm = {
  identifier: '',
  password: '',
}

const blankRegisterForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
}

function readStoredSession(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

function initialMode() {
  const activeRole = localStorage.getItem('tbg_active_role')
  const staff = readStoredSession('tbg_staff')
  const customer = readStoredSession('tbg_customer')

  if (activeRole === 'staff' && staff?.token) return 'staff'
  if (activeRole === 'customer' && customer?.token) return 'customer'
  if (staff?.token) return 'staff'
  if (customer?.token) return 'customer'
  return 'public'
}

function AuthGateway({ onAuthenticated, onCancel }) {
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState(blankLoginForm)
  const [registerForm, setRegisterForm] = useState(blankRegisterForm)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function updateLogin(event) {
    setLoginForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updateRegister(event) {
    setRegisterForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submitLogin(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const data = await request('post', '/auth/login', {
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      })
      setLoginForm(blankLoginForm)
      onAuthenticated(data)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitRegister(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const data = await request('post', '/auth/customer/register', {
        fullName: registerForm.fullName.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
      })
      setRegisterForm(blankRegisterForm)
      onAuthenticated(data)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="gateway-shell">
      <div className="gateway-panel">
        <div className="gateway-visual" aria-hidden="true">
          <div className="gateway-brand-mark">
            <span>TinkerBell</span>
            <strong>Garden</strong>
          </div>
        </div>

        <div className="gateway-card">
          <div>
            <p className="eyebrow">TinkerBell Garden</p>
            <h1>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Đăng nhập hoặc tạo tài khoản">
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

          {mode === 'login' ? (
            <form className="gateway-form" onSubmit={submitLogin}>
              <label>Email, số điện thoại hoặc tên đăng nhập
                <input
                  name="identifier"
                  autoComplete="username"
                  value={loginForm.identifier}
                  onChange={updateLogin}
                  required
                />
              </label>
              <label>Mật khẩu
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={updateLogin}
                  required
                />
              </label>
              <button className="primary-button full" type="submit" disabled={loading}>
                <LogIn size={18} /> Đăng nhập
              </button>
            </form>
          ) : (
            <form className="gateway-form" onSubmit={submitRegister}>
              <label>Họ tên
                <input name="fullName" autoComplete="name" value={registerForm.fullName} onChange={updateRegister} required />
              </label>
              <label>Email
                <input name="email" type="email" autoComplete="email" value={registerForm.email} onChange={updateRegister} required />
              </label>
              <label>Số điện thoại
                <input name="phone" autoComplete="tel" value={registerForm.phone} onChange={updateRegister} required />
              </label>
              <label>Mật khẩu
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={updateRegister}
                  required
                />
              </label>
              <button className="primary-button full" type="submit" disabled={loading}>
                <UserPlus size={18} /> Tạo tài khoản
              </button>
            </form>
          )}

          <button className="gateway-link-button" type="button" onClick={onCancel}>
            Tiếp tục khám phá
          </button>
        </div>
      </div>
    </section>
  )
}

function StaffWorkspace({ session, onLogout }) {
  const availableViews = useMemo(() => getStaffViews(session), [session])
  const [activeView, setActiveView] = useState(availableViews[0]?.id || 'ticketing')
  const current = availableViews.find((view) => view.id === activeView) || availableViews[0]
  const CurrentComponent = current?.component

  useEffect(() => {
    if (!availableViews.some((view) => view.id === activeView)) {
      setActiveView(availableViews[0]?.id || '')
    }
  }, [activeView, availableViews])

  return (
    <div className="staff-layout">
      <aside className="staff-sidebar">
        <div>
          <p className="eyebrow">TinkerBell Garden</p>
          <h2>{session.user.role}</h2>
          <span>{session.user.fullName || session.user.username}</span>
          {session.user.assignment?.areaType === 'Facility' && (
            <small>
              {(session.user.assignment.facilities || [])
                .map((facility) => facility.name)
                .join(', ') || session.user.assignment.facilityName}
            </small>
          )}
          {session.user.assignment?.areaType === 'Gate' && (
            <small>Thu vé vào cổng</small>
          )}
        </div>
        <nav>
          {availableViews.map((view) => (
            <button
              className={view.id === current?.id ? 'active' : ''}
              type="button"
              key={view.id}
              onClick={() => setActiveView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </nav>
        <button className="ghost-button" type="button" onClick={onLogout}>Đăng xuất</button>
      </aside>
      <main className="staff-main">
        {!['facilities', 'services', 'ticketing', 'vip', 'service-pos', 'reports'].includes(current?.id) && (
          <div className="staff-title">
            <h1>{current?.label}</h1>
          </div>
        )}
        {CurrentComponent ? (
          <CurrentComponent session={session} />
        ) : (
          <div className="panel">
            <h3>Chưa được phân công khu vực</h3>
            <p className="panel-note">Vui lòng liên hệ Manager để được phân vào cổng hoặc một khu vui chơi.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function Portal() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/facility/:id" element={<CustomerFacilities />} />
        <Route path="/service/:serviceId" element={<ServiceProducts />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/vip" element={<VipMembership />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  const [mode, setMode] = useState(initialMode)
  const [staffSession, setStaffSession] = useState(() => readStoredSession('tbg_staff'))
  const [customerSession, setCustomerSession] = useState(() => readStoredSession('tbg_customer'))
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false)

  useEffect(() => {
    if (mode === 'auth' || mode === 'public') return undefined

    let active = true
    const authScope = mode === 'customer' ? 'customer' : undefined
    request('get', '/auth/me', undefined, authScope ? { authScope } : {})
      .then((data) => {
        if (!active) return

        const storedKey = data.type === 'staff' ? 'tbg_staff' : 'tbg_customer'
        const stored = readStoredSession(storedKey)
        const session = { token: stored?.token, user: data.user }

        localStorage.setItem(storedKey, JSON.stringify(session))
        localStorage.setItem('tbg_active_role', data.type)

        if (data.type === 'staff') {
          setStaffSession(session)
          setMode('staff')
        } else {
          setCustomerSession(session)
          setMode('customer')
        }
      })
      .catch((error) => {
        if (!active || error.status !== 401) return
        if (mode === 'staff') {
          localStorage.removeItem('tbg_staff')
          setStaffSession(null)
        } else {
          localStorage.removeItem('tbg_customer')
          setCustomerSession(null)
        }
        localStorage.removeItem('tbg_active_role')
        setMode('public')
      })

    return () => {
      active = false
    }
  }, [mode])

  function handleAuthenticated(session) {
    if (session.type === 'staff') {
      localStorage.setItem('tbg_staff', JSON.stringify(session))
      localStorage.setItem('tbg_active_role', 'staff')
      setStaffSession(session)
      setMode('staff')
      return
    }

    localStorage.setItem('tbg_customer', JSON.stringify({ ...session, type: 'customer' }))
    localStorage.setItem('tbg_active_role', 'customer')
    setCustomerSession({ ...session, type: 'customer' })
    setMode('customer')
  }

  function logout() {
    if (mode === 'staff') {
      localStorage.removeItem('tbg_staff')
      setStaffSession(null)
    }
    if (mode === 'customer') {
      localStorage.removeItem('tbg_customer')
      setCustomerSession(null)
    }
    localStorage.removeItem('tbg_active_role')
    setCustomerMenuOpen(false)
    setMode('public')
  }

  const activeUser = mode === 'staff' ? staffSession?.user : customerSession?.user
  const activeLabel = mode === 'staff'
    ? `${activeUser?.username || 'Nhân viên'} · ${activeUser?.role || ''}`
    : activeUser?.fullName

  if (mode === 'auth') {
    return (
      <div className="app-shell">
        <AuthGateway
          onAuthenticated={handleAuthenticated}
          onCancel={() => {
            setMode('public')
          }}
        />
      </div>
    )
  }

  if (mode === 'public' || mode === 'customer') {
    return (
      <div className="app-shell user-portal-shell">
        <div className="portal-auth-floating">
          {mode === 'public' ? (
            <button className="portal-auth-button" type="button" onClick={() => setMode('auth')}>Đăng nhập</button>
          ) : (
            <div className="portal-account-menu">
              <button
                className="portal-user-chip"
                type="button"
                onClick={() => setCustomerMenuOpen((current) => !current)}
              >
                {activeLabel}
              </button>
              {customerMenuOpen && (
                <div className="portal-account-dropdown">
                  <a href="/vip">Thành viên VIP</a>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMenuOpen(false)
                      alert('Tính năng đang được phát triển')
                    }}
                  >
                    Đổi mật khẩu
                  </button>
                  <button type="button" onClick={logout}>Đăng xuất</button>
                </div>
              )}
            </div>
          )}
        </div>

        <Portal />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>TinkerBell Garden</span>
        </div>
        <div className="parent-actions">
          {mode === 'public' ? (
            <button className="ghost-button compact" type="button" onClick={() => setMode('auth')}>Đăng nhập</button>
          ) : (
            <>
              <span className="parent-chip">{activeLabel}</span>
              <button className="ghost-button compact" type="button" onClick={logout}>Đăng xuất</button>
            </>
          )}
        </div>
      </header>

      {mode === 'staff' && staffSession && <StaffWorkspace session={staffSession} onLogout={logout} />}
    </div>
  )
}
