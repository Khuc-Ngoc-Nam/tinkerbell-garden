import { useEffect, useState } from 'react'
import { request } from '../../../services/api'
import { formatCurrency, formatDate } from '../../../utils/format'
import RichTextEditor from '../components/RichTextEditor'
import './EventCampaigns.css'

const eventTypes = [
  'Cuộc thi',
  'Workshop',
  'Tri ân khách hàng',
  'Tri ân CB/NV/BQL',
  'Buổi đào tạo',
  'Buổi gặp mặt/networking',
  'Sự kiện nội bộ',
  'Khác',
  'Lễ hội',
]

const blankEvent = {
  name: '',
  eventType: 'Cuộc thi',
  description: '',
  scale: '',
  estimatedCost: 0,
  sponsor: '',
  plannedDate: '',
  startTime: '',
  endTime: '',
  registrationDeadline: '',
  deliveryMode: 'Offline',
  participationFee: 0,
  onlineDiscountPercent: 20,
  marketingHtml: '',
}

function toDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function toTimeOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function formFromEvent(event) {
  return {
    name: event.name || '',
    eventType: event.eventType || 'Khác',
    description: event.description || '',
    scale: event.scale || '',
    estimatedCost: event.estimatedCost || 0,
    sponsor: event.sponsor || '',
    plannedDate: toDateOnly(event.plannedDate || event.startDate),
    startTime: toTimeOnly(event.startTime || event.startDate),
    endTime: toTimeOnly(event.endTime || event.endDate),
    registrationDeadline: toDateOnly(event.registrationDeadline || event.startDate),
    deliveryMode: event.deliveryMode || 'Offline',
    participationFee: event.participationFee ?? event.ticketPrice ?? 0,
    onlineDiscountPercent: event.onlineDiscountPercent ?? event.discountPercent ?? 20,
    marketingHtml: event.marketingHtml || '',
  }
}

export default function EventCampaigns() {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [registrationSearch, setRegistrationSearch] = useState('')
  const [form, setForm] = useState(blankEvent)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function loadEvents() {
    setEvents(await request('get', '/events'))
  }

  async function loadRegistrations(phone = registrationSearch) {
    const query = phone.trim() ? `?phone=${encodeURIComponent(phone.trim())}` : ''
    setRegistrations(await request('get', `/events/registrations/online${query}`))
  }

  useEffect(() => {
    Promise.all([
      loadEvents(),
      request('get', '/events/registrations/online').then(setRegistrations),
    ]).catch((error) => setMessage(error.message))
  }, [])

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function startCreate() {
    setEditingId(null)
    setForm(blankEvent)
    setMessage('')
  }

  function resetForm() {
    setEditingId(null)
    setForm(blankEvent)
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    const payload = {
      ...form,
      estimatedCost: Number(form.estimatedCost || 0),
      participationFee: Number(form.participationFee || 0),
      onlineDiscountPercent: Number(form.onlineDiscountPercent || 0),
      discountRate: Number(form.onlineDiscountPercent || 0),
    }

    try {
      if (editingId) {
        await request('put', `/events/${editingId}`, payload)
      } else {
        await request('post', '/events', payload)
      }
      setMessage(editingId ? 'Đã cập nhật sự kiện' : 'Đã tạo sự kiện')
      resetForm()
      await loadEvents()
    } catch (error) {
      setMessage(error.message)
    }
  }

  function openDeleteModal(event) {
    setEventToDelete(event)
    setShowDeleteModal(true)
    setMessage('')
  }

  function closeDeleteModal() {
    if (deleteLoading) return
    setShowDeleteModal(false)
    setEventToDelete(null)
  }

  async function confirmDeleteEvent() {
    if (!eventToDelete) return
    setMessage('')
    setDeleteLoading(true)
    try {
      await request('delete', `/events/${eventToDelete.id}`)
      setMessage('Xóa thành công')
      setShowDeleteModal(false)
      setEventToDelete(null)
      await Promise.all([loadEvents(), loadRegistrations()])
    } catch (error) {
      setMessage(error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function markRegistrationPaid(registration) {
    if (registration.isPaid) return
    try {
      await request('patch', `/events/registrations/${registration.id}/paid`, {
        paymentMethod: 'Chuyển khoản',
      })
      await loadRegistrations()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <section className="event-admin-page">
      <div className="event-admin">
        <form className="event-admin-form panel" onSubmit={submit}>
          <div className="panel-heading">
            <h3>Bảng Quản lý sự kiện</h3>
            {editingId && (
              <button className="ghost-button compact" type="button" onClick={startCreate}>
                Tạo mới
              </button>
            )}
          </div>

          {message && <p className="notice">{message}</p>}

          <label className="form-field">
            <span>Tên sự kiện</span>
            <input name="name" type="text" value={form.name} onChange={updateForm} required />
          </label>

          <label className="form-field">
            <span>Hình thức sự kiện</span>
            <select name="eventType" value={form.eventType} onChange={updateForm}>
              {eventTypes.map((type) => (
                <option value={type} key={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Mô tả ngắn về sự kiện</span>
            <textarea name="description" value={form.description} onChange={updateForm} />
          </label>

          <div className="field-row">
            <label className="form-field">
              <span>Quy mô</span>
              <input name="scale" type="text" value={form.scale} onChange={updateForm} />
            </label>
            <label className="form-field">
              <span>Chi phí dự kiến</span>
              <input name="estimatedCost" type="number" min="0" value={form.estimatedCost} onChange={updateForm} />
            </label>
          </div>

          <label className="form-field">
            <span>Đơn vị tài trợ (nếu có)</span>
            <input name="sponsor" type="text" value={form.sponsor} onChange={updateForm} />
          </label>

          <div className="field-row">
            <label className="form-field">
              <span>Thời gian dự kiến tổ chức</span>
              <input name="plannedDate" type="date" value={form.plannedDate} onChange={updateForm} required />
            </label>
            <label className="form-field">
              <span>Thời hạn đăng ký tham gia</span>
              <input name="registrationDeadline" type="date" value={form.registrationDeadline} onChange={updateForm} required />
            </label>
          </div>

          <div className="event-time-row">
            <label className="form-field">
              <span>Giờ bắt đầu – kết thúc</span>
              <input name="startTime" type="time" value={form.startTime} onChange={updateForm} required />
            </label>
            <label className="form-field">
              <span>&nbsp;</span>
              <input name="endTime" type="time" value={form.endTime} onChange={updateForm} required />
            </label>
          </div>

          <fieldset className="event-radio-group">
            <legend>Diễn ra dưới hình thức</legend>
            {['Online', 'Offline', 'Hybrid'].map((mode) => (
              <label key={mode}>
                <input
                  name="deliveryMode"
                  type="radio"
                  value={mode}
                  checked={form.deliveryMode === mode}
                  onChange={updateForm}
                />
                <span>{mode}</span>
              </label>
            ))}
          </fieldset>

          <div className="field-row">
            <label className="form-field">
              <span>Chi phí tham gia</span>
              <input name="participationFee" type="number" min="0" value={form.participationFee} onChange={updateForm} />
            </label>
            <label className="form-field">
              <span>Giảm: ...% nếu đăng ký online</span>
              <input
                name="onlineDiscountPercent"
                type="number"
                min="0"
                max="100"
                value={form.onlineDiscountPercent}
                onChange={updateForm}
              />
            </label>
          </div>

          <label className="form-field">
            <span>Phần Marketing (Nội dung chi tiết)</span>
            <RichTextEditor
              value={form.marketingHtml}
              onChange={(html) => setForm((current) => ({ ...current, marketingHtml: html }))}
            />
          </label>

          <button className="primary-button full" type="submit">
            {editingId ? 'Cập nhật sự kiện' : 'Tạo sự kiện'}
          </button>
        </form>

        <div className="event-admin-table panel table-panel">
          <h3>Danh sách sự kiện</h3>
          <table>
            <thead>
              <tr>
                <th>Sự kiện</th>
                <th>Hình thức</th>
                <th>Thời gian</th>
                <th>Chi phí tham gia</th>
                <th>Giảm online</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <strong>{event.name}</strong>
                    <span className="table-subtext">{event.description || event.status}</span>
                  </td>
                  <td>
                    {event.eventType}
                    <span className="table-subtext">{event.deliveryMode}</span>
                  </td>
                  <td>
                    {formatDate(event.startDate)}
                    <span className="table-subtext">{formatDate(event.endDate)}</span>
                  </td>
                  <td>{formatCurrency(event.participationFee)}</td>
                  <td>{event.onlineDiscountPercent}%</td>
                  <td className="table-actions">
                    <button
                      className="ghost-button compact"
                      type="button"
                      onClick={() => {
                        setEditingId(event.id)
                        setForm(formFromEvent(event))
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      className="ghost-button danger compact event-delete-button"
                      type="button"
                      onClick={() => openDeleteModal(event)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="event-registration-table panel table-panel">
        <div className="event-registration-heading">
          <h3>Danh sách đăng ký sự kiện online</h3>
          <div className="event-registration-search">
            <input
              value={registrationSearch}
              onChange={(event) => setRegistrationSearch(event.target.value)}
              placeholder="Tìm kiếm theo SĐT"
            />
            <button className="ghost-button" type="button" onClick={() => loadRegistrations()}>
              Tìm kiếm
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sự kiện</th>
              <th>Khách hàng</th>
              <th>Sđt</th>
              <th>Email</th>
              <th>Số tiền phải thanh toán</th>
              <th>Đã chuyển tiền</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((registration) => (
              <tr key={registration.id}>
                <td>{registration.eventName}</td>
                <td>{registration.customerName || registration.parentName}</td>
                <td>{registration.phone}</td>
                <td>{registration.email}</td>
                <td>{formatCurrency(registration.amount ?? registration.finalAmount)}</td>
                <td>
                  <input
                    className="event-paid-checkbox"
                    type="checkbox"
                    checked={registration.isPaid}
                    disabled={registration.isPaid}
                    onChange={(event) => {
                      if (event.target.checked) markRegistrationPaid(registration)
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showDeleteModal && eventToDelete && (
        <div className="event-delete-modal-backdrop" onClick={closeDeleteModal}>
          <div className="event-delete-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Xóa sự kiện {eventToDelete.name}</h3>
            <div className="event-delete-modal-actions">
              <button
                className="event-delete-confirm-button"
                type="button"
                onClick={confirmDeleteEvent}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Đang xóa...' : 'Đồng ý'}
              </button>
              <button
                className="event-delete-cancel-button"
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
