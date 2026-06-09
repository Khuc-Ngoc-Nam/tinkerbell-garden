import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import { formatDate } from '../../../utils/format'
import './VipManager.css'

export default function VipManager() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  async function loadCustomers() {
    setCustomers(await request('get', '/customers/vip/list'))
  }

  useEffect(() => {
    loadCustomers().catch((error) => setMessage(error.message))
  }, [])

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return customers
    return customers.filter((customer) => {
      const username = String(customer.username || customer.email || customer.phone || '').toLowerCase()
      return username.includes(keyword)
    })
  }, [customers, search])

  return (
    <section className="vip-manager-page">
      <div className="vip-manager-heading">
        <h1>Khách hàng VIP</h1>
        <label>
          <span>Tìm kiếm</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo Tên đăng nhập"
          />
        </label>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Khách hàng</th>
              <th>Thời hạn</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer, index) => (
              <tr key={customer.id}>
                <td>{index + 1}</td>
                <td>{customer.username || customer.email || customer.phone}</td>
                <td>{formatDate(customer.vipExpiryDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
