import { useCallback, useEffect, useState } from 'react'
import { request } from '../../../services/api'
import { todayInput } from '../../../utils/format'

export default function VisitorStats() {
  const [from, setFrom] = useState(todayInput())
  const [to, setTo] = useState(todayInput())
  const [report, setReport] = useState(null)
  const [message, setMessage] = useState('')

  const loadReport = useCallback(async () => {
    setReport(await request('get', `/reports/visitors?from=${from}&to=${to}`))
  }, [from, to])

  useEffect(() => {
    loadReport().catch((error) => setMessage(error.message))
  }, [loadReport])

  const summary = report?.summary || {}

  return (
    <section className="panel wide">
      <div className="panel-heading">
        <div>
          <h3>Thống kê lượt chơi</h3>
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
        <article><span>Lượt chơi</span><strong>{summary.sessions || 0}</strong></article>
        <article><span>Số bé</span><strong>{summary.children || 0}</strong></article>
        <article><span>Phụ huynh đi kèm</span><strong>{summary.adults || 0}</strong></article>
        <article><span>Lượt VIP</span><strong>{summary.vipSessions || 0}</strong></article>
      </div>

      <table>
        <thead>
          <tr>
            <th>Loại vé</th>
            <th>Lượt</th>
            <th>Số bé</th>
          </tr>
        </thead>
        <tbody>
          {(report?.byTicketType || []).map((row) => (
            <tr key={row.ticketType}>
              <td>{row.ticketType}</td>
              <td>{row.sessions}</td>
              <td>{row.children}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
