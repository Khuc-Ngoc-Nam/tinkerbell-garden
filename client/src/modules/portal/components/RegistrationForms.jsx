import { useEffect, useState } from 'react'
import { request } from '../../../services/api'
import { formatCurrency, formatDateOnly } from '../../../utils/format'

const blankCustomer = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
}

export default function RegistrationForms({ events, selectedEvent, customerSession, onCustomerSession, onBooked }) {
  const [customerForm, setCustomerForm] = useState(blankCustomer)
  const [bookingForm, setBookingForm] = useState({
    eventId: selectedEvent?.id || events[0]?.id || '',
    childName: '',
    childAge: '',
    quantity: 1,
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const activeEvent = events.find((event) => event.id === Number(bookingForm.eventId)) || selectedEvent || events[0]
  const profile = customerSession?.user
  const contact = profile || customerForm

  useEffect(() => {
    if (selectedEvent?.id) {
      setBookingForm((current) => ({ ...current, eventId: selectedEvent.id }))
    }
  }, [selectedEvent])

  function updateCustomer(event) {
    setCustomerForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function updateBooking(event) {
    setBookingForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function customerLogin(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const data = await request('post', '/auth/customer/login', {
        emailOrPhone: customerForm.email || customerForm.phone,
        password: customerForm.password,
      })
      localStorage.setItem('tbg_customer', JSON.stringify(data))
      onCustomerSession(data)
      setMessage(`Đã đăng nhập: ${data.user.fullName}`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function customerRegister(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const data = await request('post', '/auth/customer/register', customerForm)
      localStorage.setItem('tbg_customer', JSON.stringify(data))
      onCustomerSession(data)
      setMessage(`Tài khoản đã tạo: ${data.user.fullName}`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function bookEvent(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const data = await request('post', '/portal/events/book', {
        ...bookingForm,
        eventId: Number(bookingForm.eventId),
        quantity: Number(bookingForm.quantity),
        childAge: bookingForm.childAge ? Number(bookingForm.childAge) : null,
        fullName: contact.fullName,
        email: contact.email,
        phone: contact.phone,
      })
      setMessage(`Mã đặt chỗ: ${data.qrCode}. Cần thanh toán ${formatCurrency(data.finalAmount)} tại quầy.`)
      onBooked?.(data)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function registerVip(event) {
    event.preventDefault()
    if (!profile) {
      setMessage('Vui lòng đăng nhập tài khoản phụ huynh trước khi đăng ký VIP.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const data = await request('post', '/portal/vip/register', {}, { authScope: 'customer' })
      setMessage(`VIP đã kích hoạt đến ${formatDateOnly(data.vipExpiryDate)}`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section form-section" id="vip">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Đăng ký trực tuyến</p>
          <h2>Đặt sự kiện và VIP</h2>
        </div>
        {message && <span className="notice">{message}</span>}
      </div>

      <div className="form-grid">
        <form className="panel" onSubmit={customerLogin}>
          <h3>Tài khoản phụ huynh</h3>
          {profile ? (
            <div className="profile-box">
              <strong>{profile.fullName}</strong>
              <span>{profile.email}</span>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  localStorage.removeItem('tbg_customer')
                  onCustomerSession(null)
                }}
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <input name="fullName" placeholder="Họ tên phụ huynh" value={customerForm.fullName} onChange={updateCustomer} />
              <input name="email" type="email" placeholder="Email" value={customerForm.email} onChange={updateCustomer} />
              <input name="phone" placeholder="Số điện thoại" value={customerForm.phone} onChange={updateCustomer} />
              <input name="password" type="password" placeholder="Mật khẩu" value={customerForm.password} onChange={updateCustomer} />
              <div className="button-row">
                <button className="primary-button" disabled={loading} type="submit">Đăng nhập</button>
                <button className="secondary-button" disabled={loading} type="button" onClick={customerRegister}>Tạo tài khoản</button>
              </div>
            </>
          )}
        </form>

        <form className="panel" onSubmit={bookEvent}>
          <h3>Vé sự kiện</h3>
          <select name="eventId" value={bookingForm.eventId || activeEvent?.id || ''} onChange={updateBooking} required>
            {events.map((event) => (
              <option value={event.id} key={event.id}>{event.name}</option>
            ))}
          </select>
          <input name="childName" placeholder="Tên bé" value={bookingForm.childName} onChange={updateBooking} />
          <input name="childAge" type="number" min="1" max="15" placeholder="Tuổi" value={bookingForm.childAge} onChange={updateBooking} />
          <input name="quantity" type="number" min="1" placeholder="Số vé" value={bookingForm.quantity} onChange={updateBooking} />
          <button className="primary-button full" disabled={loading || !contact.fullName || !contact.email || !contact.phone} type="submit">
            Nhận mã đặt chỗ
          </button>
        </form>

        <form className="panel" onSubmit={registerVip}>
          <h3>Thành viên VIP</h3>
          <p className="panel-note">400.000 VND/năm, giảm 20% vé vào cửa cho một bé mỗi lượt chơi.</p>
          <button className="primary-button full" disabled={loading || !profile} type="submit">
            Đăng ký hoặc gia hạn
          </button>
        </form>
      </div>
    </section>
  )
}
