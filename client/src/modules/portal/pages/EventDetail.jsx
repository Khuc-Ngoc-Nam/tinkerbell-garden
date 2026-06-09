import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { request } from '../../../services/api'
import { formatCurrency, formatDate } from '../../../utils/format'
import './EventDetail.css'

const blankRegistration = {
  parentName: '',
  phone: '',
  email: '',
  ticketCount: 1,
}

function readCustomerSession() {
  try {
    return JSON.parse(localStorage.getItem('tbg_customer') || 'null')
  } catch {
    return null
  }
}

function isActiveVip(customer) {
  if (!customer?.isVip) return false
  if (!customer.vipExpiryDate) return false
  return new Date(customer.vipExpiryDate) >= new Date()
}

function emptyChildren(count) {
  return Array.from({ length: count }, (_, index) => ({
    rowNo: index + 1,
    childName: '',
    mobile: '',
    birthDate: '',
  }))
}

function formatAmountText(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

export default function EventDetail() {
  const { id } = useParams()
  const [eventDetail, setEventDetail] = useState(null)
  const [registration, setRegistration] = useState(blankRegistration)
  const [children, setChildren] = useState(emptyChildren(1))
  const [step, setStep] = useState('closed')
  const [payment, setPayment] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successPopup, setSuccessPopup] = useState('')

  const customerSession = useMemo(() => readCustomerSession(), [])
  const customerIsVip = isActiveVip(customerSession?.user)

  useEffect(() => {
    let active = true

    request('get', `/portal/events/${id}`)
      .then((data) => {
        if (active) setEventDetail(data)
      })
      .catch((error) => {
        if (active) setMessage(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  function updateRegistration(event) {
    setRegistration((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function confirmRegistration(event) {
    event.preventDefault()
    const count = Math.max(1, Number(registration.ticketCount || 1))
    setRegistration((current) => ({ ...current, ticketCount: count }))
    setChildren(emptyChildren(count))
    setStep('children')
  }

  function updateChild(index, field, value) {
    setChildren((current) => current.map((child, childIndex) => (
      childIndex === index ? { ...child, [field]: value } : child
    )))
  }

  function preparePayment(event) {
    event.preventDefault()
    const ticketCount = Number(registration.ticketCount || 1)
    const unitPrice = Number(eventDetail?.participationFee || 0)
    const earlyDiscount = 20
    const vipDiscount = customerIsVip ? 20 : 0
    const amount = Math.max(0, Math.round(unitPrice * ticketCount * (100 - earlyDiscount - vipDiscount) / 100))

    setPayment({
      amount,
      earlyDiscount,
      vipDiscount,
      transferContent: `${registration.phone} ${registration.parentName}`,
    })
    setStep('payment')
  }

  async function submitTransfer() {
    setSubmitting(true)
    setMessage('')
    try {
      await request('post', `/portal/events/${id}/register`, {
        ...registration,
        ticketCount: Number(registration.ticketCount || 1),
        children,
      }, { authScope: 'customer' })
      setSuccessPopup(
        `Tinkerbell Garden xin chân thành cảm ơn quý khách đã đăng ký tham dự sự kiện ${eventDetail.name}. Chúng tôi sẽ kiểm tra hóa đơn thanh toán và sẽ phản hồi tới gmail của quý khách trong thời gian sớm nhất. Nếu có vấn đề gì trong quá trình giao dịch, quý khách vui lòng liên hệ tới hotline 0963.417.453 để được nhân viên hỗ trợ. Tinkerbell Garden xin chân thành cảm ơn quý khách!`,
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="event-detail-page">
      <header className="event-detail-header">
        <Link className="event-back-link" to="/">Quay lại trang chủ</Link>
        {loading && <p className="event-message">Đang tải sự kiện...</p>}
        {message && <p className="event-message is-error">{message}</p>}
        {!loading && eventDetail && (
          <div>
            <span>{eventDetail.eventType}</span>
            <h1>{eventDetail.name}</h1>
            <p>{eventDetail.description}</p>
            <div className="event-detail-meta">
              <strong>{formatDate(eventDetail.startDate)}</strong>
              <strong>{formatCurrency(eventDetail.participationFee)}</strong>
            </div>
          </div>
        )}
      </header>

      {!loading && eventDetail && (
        <section className="event-article-shell">
          <article
            className="event-marketing-article"
            dangerouslySetInnerHTML={{
              __html: eventDetail.marketingHtml || `<p>${eventDetail.description || ''}</p>`,
            }}
          />
          <button className="event-online-button" type="button" onClick={() => setStep('registration')}>
            Đặt vé online ngay
          </button>
        </section>
      )}

      {step !== 'closed' && eventDetail && (
        <div className="event-modal-backdrop" onClick={() => setStep('closed')}>
          <div className="event-modal" onClick={(modalEvent) => modalEvent.stopPropagation()}>
            <div className="event-modal-heading">
              <h2>ĐĂNG KÍ THAM GIA SỰ KIỆN</h2>
              <button className="event-close-button" type="button" onClick={() => setStep('closed')}>X</button>
            </div>

            {step === 'registration' && (
              <form className="event-register-form" onSubmit={confirmRegistration}>
                <label>
                  <span>Họ và tên Phụ huynh</span>
                  <input name="parentName" value={registration.parentName} onChange={updateRegistration} required />
                </label>
                <label>
                  <span>SĐT</span>
                  <input name="phone" value={registration.phone} onChange={updateRegistration} required />
                </label>
                <label>
                  <span>Email Liên hệ</span>
                  <input name="email" type="email" value={registration.email} onChange={updateRegistration} required />
                </label>
                <label>
                  <span>Số vé đăng ký</span>
                  <input
                    name="ticketCount"
                    type="number"
                    min="1"
                    max="50"
                    value={registration.ticketCount}
                    onChange={updateRegistration}
                    required
                  />
                </label>
                <button className="primary-button full" type="submit">Đồng ý</button>
              </form>
            )}

            {step === 'children' && (
              <form className="event-children-form" onSubmit={preparePayment}>
                <div className="event-child-table-wrap">
                  <table className="event-child-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Họ tên bé</th>
                        <th>Mobile</th>
                        <th>Ngày sinh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child, index) => (
                        <tr key={child.rowNo}>
                          <td>{index + 1}</td>
                          <td>
                            <input value={child.childName} onChange={(event) => updateChild(index, 'childName', event.target.value)} required />
                          </td>
                          <td>
                            <input value={child.mobile} onChange={(event) => updateChild(index, 'mobile', event.target.value)} />
                          </td>
                          <td>
                            <input type="date" value={child.birthDate} onChange={(event) => updateChild(index, 'birthDate', event.target.value)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="primary-button full" type="submit">Đồng ý và thanh toán</button>
              </form>
            )}

            {step === 'payment' && payment && (
              <div className="event-payment-box">
                <p>
                  Xin chúc mừng, bạn nhận được ưu đãi 20% do đăng ký tham dự sự kiện sớm.
                  {customerIsVip && ' Đồng thời, bạn cũng được giảm giá 20% theo ưu đãi của thành viên VIP.'}
                  {' '}Bạn vui lòng chuyển khoản số tiền <strong>{formatAmountText(payment.amount)}</strong> vnđ đến tài khoản ngân hàng dưới đây.
                  Vui lòng chuyển khoản theo cú pháp: SĐT + Tên khách hàng.
                </p>
                <img src="/myQR.jpg" alt="Mã QR chuyển khoản TinkerBell Garden" />
                <button className="primary-button full" type="button" onClick={submitTransfer} disabled={submitting}>
                  Đã chuyển tiền
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {successPopup && (
        <div className="event-confirm-popup-backdrop">
          <div className="event-confirm-popup">
            <p>{successPopup}</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setSuccessPopup('')
                setStep('closed')
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
