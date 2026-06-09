import { useCallback, useEffect, useState } from 'react'
import { request } from '../../../services/api'
import { formatCurrency, todayInput } from '../../../utils/format'

export default function DailyRevenue() {
  const [from, setFrom] = useState(todayInput())
  const [to, setTo] = useState(todayInput())
  const [report, setReport] = useState(null)
  const [message, setMessage] = useState('')

  const loadReport = useCallback(async () => {
    setReport(await request('get', `/reports/revenue?from=${from}&to=${to}`))
  }, [from, to])

  useEffect(() => {
    loadReport().catch((error) => setMessage(error.message))
  }, [loadReport])

  const breakdown = report?.sourceBreakdown || {}

  return (
    <section className="panel wide">
      <div className="panel-heading">
        <div>
          <h3>Báo cáo doanh thu</h3>
          {message && <p className="notice">{message}</p>}
        </div>
        <form className="inline-search" onSubmit={(event) => {
          event.preventDefault()
          loadReport().catch((error) => setMessage(error.message))
        }}>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <button className="primary-button" type="submit">Lọc</button>
        </form>
      </div>

      <div className="metric-grid">
        <article><span>Vé vào cửa</span><strong>{formatCurrency(breakdown.ticket)}</strong></article>
        <article><span>Phí quá giờ</span><strong>{formatCurrency(breakdown.overtime)}</strong></article>
        <article><span>Dịch vụ phát sinh</span><strong>{formatCurrency(breakdown.paidService)}</strong></article>
        <article><span>Thẻ VIP</span><strong>{formatCurrency(breakdown.vipMembership)}</strong></article>
        <article><span>Sự kiện</span><strong>{formatCurrency(breakdown.eventBooking)}</strong></article>
        <article className="metric-total"><span>Tổng doanh thu</span><strong>{formatCurrency(report?.totalRevenue)}</strong></article>
      </div>

      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Vé</th>
            <th>Quá giờ</th>
            <th>Dịch vụ</th>
            <th>VIP</th>
            <th>Sự kiện</th>
            <th>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {(report?.daily || []).map((day) => (
            <tr key={String(day.date)}>
              <td>{String(day.date).slice(0, 10)}</td>
              <td>{formatCurrency(day.ticket)}</td>
              <td>{formatCurrency(day.overtime)}</td>
              <td>{formatCurrency(day.paidService)}</td>
              <td>{formatCurrency(day.vipMembership)}</td>
              <td>{formatCurrency(day.eventBooking)}</td>
              <td>{formatCurrency(day.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
