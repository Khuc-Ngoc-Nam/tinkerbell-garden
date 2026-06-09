import { useEffect, useState } from 'react'
import PaymentModal from '../components/PaymentModal'
import { request } from '../../../services/api'
import { formatCurrency, formatDate } from '../../../utils/format'
import './Ticketing.css'

const vipPackages = [
  { years: 1, label: '1 năm - 400,000', amount: 400000 },
  { years: 2, label: '2 năm - 750,000', amount: 750000 },
  { years: 3, label: '3 năm - 1,000,000', amount: 1000000 },
]

function isVip(customer) {
  return Boolean(customer?.isVip) && (!customer.vipExpiryDate || new Date(customer.vipExpiryDate) >= new Date())
}

function formatMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes || 0))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60
  if (!hours) return `${minutes} phút`
  if (!minutes) return `${hours} giờ`
  return `${hours} giờ ${minutes} phút`
}

export default function Ticketing() {
  const [ticketTypes, setTicketTypes] = useState([])
  const [ongoingEvents, setOngoingEvents] = useState([])
  const [sessions, setSessions] = useState([])
  const [activeTab, setActiveTab] = useState('play')
  const [username, setUsername] = useState('')
  const [customer, setCustomer] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [typeId, setTypeId] = useState('')
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [eventId, setEventId] = useState('')
  const [eventQuantity, setEventQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [vipModalOpen, setVipModalOpen] = useState(false)
  const [vipForm, setVipForm] = useState({ username: '', years: 1 })
  const [vipMessage, setVipMessage] = useState('')
  const [payment, setPayment] = useState(null)
  const [checkoutPreview, setCheckoutPreview] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState('')

  async function loadData() {
    const [types, openSessions, eventList] = await Promise.all([
      request('get', '/tickets/types'),
      request('get', '/tickets/sessions/active'),
      request('get', '/events/ongoing'),
    ])
    const runningEvents = eventList || []

    setTicketTypes(types)
    setSessions(openSessions)
    setOngoingEvents(runningEvents)
    setTypeId((current) => current || (types[0]?.id ? String(types[0].id) : ''))
    setEventId((current) => current || (runningEvents[0]?.id ? String(runningEvents[0].id) : ''))
  }

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message))
  }, [])

  const selectedVipPackage = vipPackages.find((pack) => pack.years === Number(vipForm.years)) || vipPackages[0]
  const checkoutTotal = Number(checkoutPreview?.finalAmount || 0)
  const checkoutGross = Number(checkoutPreview?.grossAmount || 0)
  const checkoutVipDiscount = Number(checkoutPreview?.vipDiscount || 0)
  const checkoutHasPayment = checkoutTotal > 0

  async function lookupCustomer() {
    setMessage('')
    setCustomer(null)
    const account = username.trim()
    if (!account) return

    try {
      const data = await request('get', `/customers/lookup?username=${encodeURIComponent(account)}`)
      setCustomer(data)
      setGuestName(data.fullName || '')
    } catch {
      setMessage('Không tìm thấy tài khoản. Thu ngân có thể nhập tên khách vãng lai.')
    }
  }

  function validateTicketForm() {
    if (username.trim() && !customer) {
      setMessage('Vui lòng bấm Tìm kiếm để xác thực Username khách trước khi tạo vé.')
      return false
    }
    if (!customer && !guestName.trim()) {
      setMessage('Vui lòng nhập tên khách vãng lai.')
      return false
    }
    if (activeTab === 'play' && !typeId) {
      setMessage('Vui lòng chọn loại vé.')
      return false
    }
    if (activeTab === 'event' && !eventId) {
      setMessage('Vui lòng chọn sự kiện đang diễn ra hoặc sắp diễn ra.')
      return false
    }
    setMessage('')
    return true
  }

  async function createTicket() {
    if (!validateTicketForm()) return

    const payload = activeTab === 'play'
      ? {
          username: customer ? username.trim() : undefined,
          fullName: customer ? undefined : guestName.trim(),
          purpose: 'Play',
          typeId: Number(typeId),
          quantity: Math.max(1, Number(ticketQuantity || 1)),
        }
      : {
          username: customer ? username.trim() : undefined,
          fullName: customer ? undefined : guestName.trim(),
          purpose: 'Event',
          eventId: Number(eventId),
          quantity: Math.max(1, Number(eventQuantity || 1)),
        }

    const session = await request('post', '/tickets/sessions', payload)
    setMessage(`Đã tạo vé #${session.id}. Trạng thái: Chưa check-in.`)
    setUsername('')
    setCustomer(null)
    setGuestName('')
    setTicketQuantity(1)
    setEventQuantity(1)
    await loadData()
  }

  async function checkinSession(session) {
    await request('patch', `/tickets/sessions/${session.id}/checkin`)
    setMessage(`Đã Check-in #${session.id}.`)
    await loadData()
  }

  async function openCheckoutModal(session) {
    setCheckoutMessage('')
    setCheckoutLoading(true)
    try {
      const preview = await request('get', `/tickets/sessions/${session.id}/checkout-preview`)
      setCheckoutPreview({ ...preview, session })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function completeCheckout(paymentMethod = 'Tiền mặt') {
    if (!checkoutPreview?.sessionId) return
    const result = await request('post', `/tickets/sessions/${checkoutPreview.sessionId}/checkout`, {
      paymentMethod,
    })
    setMessage(`Đã Check-out #${checkoutPreview.sessionId}. Tổng thanh toán: ${formatCurrency(result.finalAmount || 0)}`)
    setCheckoutPreview(null)
    setCheckoutMessage('')
    setPayment(null)
    await loadData()
  }

  function openCheckoutPayment(paymentMethod) {
    setCheckoutMessage('')
    setPayment({ kind: 'checkout', paymentMethod })
  }

  function openVipPayment(paymentMethod) {
    if (!vipForm.username.trim()) {
      setVipMessage('Vui lòng nhập Username.')
      return
    }
    setVipMessage('')
    setPayment({ kind: 'vip', paymentMethod })
  }

  async function finishPayment() {
    try {
      if (payment.kind === 'vip') {
        const customerData = await request('post', '/customers/vip/counter-renew', {
          username: vipForm.username.trim(),
          years: Number(vipForm.years),
          paymentMethod: payment.paymentMethod,
        })
        setVipMessage(`Đã cập nhật VIP cho ${customerData.username || customerData.fullName}`)
        setVipForm({ username: '', years: 1 })
        setPayment(null)
        await loadData()
        return
      }

      if (payment.kind === 'checkout') {
        await completeCheckout(payment.paymentMethod)
      }
    } catch (error) {
      if (payment.kind === 'vip') {
        setVipMessage(error.message)
      } else {
        setCheckoutMessage(error.message)
      }
    }
  }

  return (
    <section className="ticketing-admin-page">
      <div className="ticketing-page-header">
        <h1>Thu ngân</h1>
        <button className="primary-button" type="button" onClick={() => setVipModalOpen(true)}>
          + Đăng ký/ Gia hạn VIP
        </button>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="ticketing-layout">
        <form className="ticketing-card" onSubmit={(event) => event.preventDefault()}>
          <h2>Bán vé</h2>

          <div className="ticketing-lookup-row">
            <label>
              <span>Nhập Username khách</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <button className="ghost-button" type="button" onClick={lookupCustomer}>Tìm kiếm</button>
          </div>

          {isVip(customer) && <p className="ticketing-vip-label">VIP</p>}

          <label className="ticketing-field">
            <span>Tên khách vãng lai</span>
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              disabled={Boolean(customer)}
              placeholder="Nhập tên nếu khách không có tài khoản"
            />
          </label>

          <div className="ticketing-tabs" role="tablist" aria-label="Mục đích vào cổng">
            <button
              className={activeTab === 'play' ? 'active' : ''}
              type="button"
              onClick={() => setActiveTab('play')}
            >
              Mua vé vui chơi
            </button>
            <button
              className={activeTab === 'event' ? 'active' : ''}
              type="button"
              onClick={() => setActiveTab('event')}
            >
              Tham gia sự kiện
            </button>
          </div>

          {activeTab === 'play' ? (
            <div className="ticketing-tab-panel">
              <label className="ticketing-field">
                <span>Chọn loại vé</span>
                <select value={typeId} onChange={(event) => setTypeId(event.target.value)}>
                  {ticketTypes.map((type) => (
                    <option value={type.id} key={type.id}>
                      {type.name} - {formatCurrency(type.basePrice)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ticketing-field">
                <span>Số lượng vé</span>
                <input
                  type="number"
                  min="1"
                  value={ticketQuantity}
                  onChange={(event) => setTicketQuantity(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="ticketing-tab-panel">
              <label className="ticketing-field">
                <span>Chọn sự kiện đang diễn ra</span>
                <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
                  <option value="">Chọn sự kiện đang diễn ra</option>
                  {ongoingEvents.map((event) => (
                    <option value={event.id} key={event.id}>
                      {event.name} - {formatCurrency(event.participationFee)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ticketing-field">
                <span>Số vé đăng ký</span>
                <input
                  type="number"
                  min="1"
                  value={eventQuantity}
                  onChange={(event) => setEventQuantity(event.target.value)}
                />
              </label>
            </div>
          )}

          <button className="primary-button full" type="button" onClick={createTicket}>
            Tạo vé
          </button>
        </form>

        <section className="ticketing-card ticketing-session-card">
          <div className="panel-heading">
            <h2>Quản lý khách ra/vào</h2>
            <button className="ghost-button" type="button" onClick={loadData}>Làm mới</button>
          </div>
          <div className="ticketing-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Khách</th>
                  <th>Loại vé</th>
                  <th>Tổng số tiền phải thanh toán</th>
                  <th>Check-in</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>#{session.id}</td>
                    <td>{session.customerName}</td>
                    <td>{session.ticketType || session.eventName}</td>
                    <td>{formatCurrency(session.amountDue)}</td>
                    <td>{session.status === 'Pending' ? 'Chưa check-in' : formatDate(session.checkinTime)}</td>
                    <td>
                      {session.status === 'Pending' ? (
                        <button
                          className="checkin-button"
                          type="button"
                          onClick={() => {
                            checkinSession(session).catch((error) => setMessage(error.message))
                          }}
                        >
                          Check-in
                        </button>
                      ) : (
                        <button
                          className="checkout-button"
                          type="button"
                          onClick={() => openCheckoutModal(session)}
                          disabled={checkoutLoading}
                        >
                          Check-out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-table-cell">Không có khách đang chờ hoặc đang chơi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {vipModalOpen && (
        <div className="ticketing-modal-backdrop" onClick={() => setVipModalOpen(false)}>
          <div className="ticketing-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ticketing-modal-heading">
              <h2>Đăng ký/Gia hạn VIP tại quầy</h2>
              <button className="ghost-button compact" type="button" onClick={() => setVipModalOpen(false)}>
                Đóng
              </button>
            </div>

            <div className="ticketing-vip-form">
              {vipMessage && <p className="notice">{vipMessage}</p>}
              <label className="form-field">
                <span>Username</span>
                <input
                  name="username"
                  type="text"
                  value={vipForm.username}
                  onChange={(event) => setVipForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="Nhập Username"
                />
              </label>
              <label className="form-field">
                <span>Thời gian gia hạn</span>
                <select
                  name="years"
                  value={vipForm.years}
                  onChange={(event) => setVipForm((current) => ({ ...current, years: Number(event.target.value) }))}
                >
                  {vipPackages.map((pack) => (
                    <option value={pack.years} key={pack.years}>{pack.label}</option>
                  ))}
                </select>
              </label>
              <div className="ticketing-total-box">
                <span>Số tiền</span>
                <strong>{formatCurrency(selectedVipPackage.amount)}</strong>
              </div>
              <div className="ticketing-payment-actions">
                <button type="button" onClick={() => openVipPayment('Tiền mặt')}>Tiền mặt</button>
                <button type="button" onClick={() => openVipPayment('Chuyển khoản')}>Chuyển khoản</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {checkoutPreview && (
        <div className="ticketing-modal-backdrop" onClick={() => setCheckoutPreview(null)}>
          <div className="ticketing-modal checkout-summary-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ticketing-modal-heading">
              <h2>Thanh toán Check-out</h2>
              <button className="ghost-button compact" type="button" onClick={() => setCheckoutPreview(null)}>
                Đóng
              </button>
            </div>

            {checkoutMessage && <p className="notice">{checkoutMessage}</p>}

            <div className="checkout-summary-list">
              <div>
                <span>Tên khách hàng / Mã lượt chơi</span>
                <strong>{checkoutPreview.customerName} / #{checkoutPreview.sessionId}</strong>
              </div>
              <div>
                <span>Giờ Check-in - Giờ Check-out</span>
                <strong>{formatDate(checkoutPreview.checkinTime)} - {formatDate(checkoutPreview.checkoutTime)}</strong>
              </div>
              <div>
                <span>Tổng thời gian chơi</span>
                <strong>{formatMinutes(checkoutPreview.playedMinutes)}</strong>
              </div>
            </div>

            <div className="checkout-bill-box">
              <h3>Chi tiết Bill</h3>
              <div className="checkout-bill-row">
                <span>Tiền vé (Vào cửa/Sự kiện)</span>
                <strong>{formatCurrency(checkoutPreview.ticketFee)}</strong>
                {checkoutPreview.prepaidOnline && <em>Đã thanh toán online</em>}
              </div>
              <div className="checkout-bill-row">
                <span>Tiền dịch vụ phát sinh</span>
                <strong>{formatCurrency(checkoutPreview.serviceAmount)}</strong>
              </div>
              {checkoutPreview.services?.length > 0 && (
                <div className="checkout-service-lines">
                  {checkoutPreview.services.map((item) => (
                    <p key={item.id}>
                      {item.name} x {item.quantity}: {formatCurrency(item.lineTotal)}
                    </p>
                  ))}
                </div>
              )}
              <div className="checkout-bill-row">
                <span>Tiền phạt lố giờ</span>
                <strong>{formatCurrency(checkoutPreview.overtimePenalty)}</strong>
              </div>
              {checkoutPreview.overtimePenalty > 0 && (
                <p className="checkout-bill-note">
                  Lố {checkoutPreview.overtimeMinutes} phút, tính {checkoutPreview.overtimeBlocks} block
                  x {formatCurrency(checkoutPreview.overtimeBlockFee)}.
                </p>
              )}
              <div className="checkout-bill-row">
                <span>Tổng trước ưu đãi</span>
                <strong>{formatCurrency(checkoutGross)}</strong>
              </div>
              {checkoutVipDiscount > 0 && (
                <div className="checkout-bill-row discount">
                  <span>Ưu đãi VIP 20%</span>
                  <strong>-{formatCurrency(checkoutVipDiscount)}</strong>
                </div>
              )}
              <div className="checkout-bill-row total">
                <span>Tổng</span>
                <strong>{formatCurrency(checkoutTotal)}</strong>
              </div>
            </div>

            {checkoutHasPayment ? (
              <div className="ticketing-payment-actions">
                <button type="button" onClick={() => openCheckoutPayment('Tiền mặt')}>Tiền mặt</button>
                <button type="button" onClick={() => openCheckoutPayment('Chuyển khoản')}>Chuyển khoản</button>
              </div>
            ) : (
              <button
                className="primary-button full"
                type="button"
                onClick={() => {
                  completeCheckout().catch((error) => setCheckoutMessage(error.message))
                }}
              >
                Xác nhận Check-out & Kết thúc
              </button>
            )}
          </div>
        </div>
      )}

      <PaymentModal
        open={Boolean(payment)}
        amount={payment?.kind === 'vip' ? selectedVipPackage.amount : checkoutTotal}
        paymentMethod={payment?.paymentMethod}
        onClose={() => setPayment(null)}
        onDone={finishPayment}
      />
    </section>
  )
}
