import { useCallback, useEffect, useState } from 'react'
import { request } from '../../../services/api'
import { formatCurrency, formatDate } from '../../../utils/format'

export default function BookingsList() {
  const [bookings, setBookings] = useState([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const loadBookings = useCallback(async () => {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    setBookings(await request('get', `/events/bookings/list${query}`))
  }, [search])

  useEffect(() => {
    loadBookings().catch((error) => setMessage(error.message))
  }, [loadBookings])

  async function changeStatus(qrCode, status) {
    try {
      await request('patch', `/events/bookings/${encodeURIComponent(qrCode)}/status`, { status })
      setMessage(`Đã cập nhật ${qrCode}`)
      await loadBookings()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <section className="panel table-panel wide">
      <div className="panel-heading">
        <div>
          <h3>Đăng ký online</h3>
          {message && <p className="notice">{message}</p>}
        </div>
        <form className="inline-search" onSubmit={(event) => {
          event.preventDefault()
          loadBookings().catch((error) => setMessage(error.message))
        }}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm QR, tên, email, SĐT" />
          <button className="primary-button" type="submit">Tìm</button>
        </form>
      </div>

      <table>
        <thead>
          <tr>
            <th>Mã QR</th>
            <th>Sự kiện</th>
            <th>Phụ huynh</th>
            <th>Tiền</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td><code>{booking.qrCode}</code></td>
              <td>
                {booking.eventName}
                <span className="table-subtext">{formatDate(booking.bookingDate)}</span>
              </td>
              <td>
                {booking.customerName}
                <span className="table-subtext">{booking.email}</span>
              </td>
              <td>{formatCurrency(booking.finalAmount)}</td>
              <td>{booking.status}</td>
              <td className="table-actions">
                <button className="ghost-button" type="button" onClick={() => changeStatus(booking.qrCode, 'Paid')}>Đã thanh toán</button>
                <button className="ghost-button" type="button" onClick={() => changeStatus(booking.qrCode, 'CheckedIn')}>Check-in</button>
                <button className="ghost-button danger" type="button" onClick={() => changeStatus(booking.qrCode, 'Cancelled')}>Hủy</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
