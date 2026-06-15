import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import { formatDate } from '../../../utils/format'
import './VipManager.css'

function vipPackageLabel(years) {
  const normalizedYears = Number(years || 1)
  return `${normalizedYears} năm`
}

function customerUsername(customer) {
  return customer.username || customer.email || customer.phone || ''
}

export default function VipManager({ session }) {
  const [customers, setCustomers] = useState([])
  const [onlineRequests, setOnlineRequests] = useState([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [requestToApprove, setRequestToApprove] = useState(null)
  const [approving, setApproving] = useState(false)

  const isManager = session?.user?.role === 'Manager'

  async function loadOnlineRequests() {
    if (!isManager) {
      setOnlineRequests([])
      return
    }
    setOnlineRequests(await request('get', '/customers/vip/online-requests'))
  }

  async function loadData() {
    const [vipRows, requestRows] = await Promise.all([
      request('get', '/customers/vip/list'),
      isManager ? request('get', '/customers/vip/online-requests') : Promise.resolve([]),
    ])
    setCustomers(vipRows)
    setOnlineRequests(requestRows)
  }

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message))
  }, [isManager])

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return customers
    return customers.filter((customer) => customerUsername(customer).toLowerCase().includes(keyword))
  }, [customers, search])

  function closeApproveModal() {
    if (approving) return
    setRequestToApprove(null)
  }

  async function approveOnlineRequest() {
    if (!requestToApprove) return
    setApproving(true)
    setMessage('')

    try {
      const approvedCustomer = await request('post', `/customers/vip/online-requests/${requestToApprove.id}/approve`)
      setOnlineRequests((current) => current.filter((item) => item.id !== requestToApprove.id))
      setCustomers((current) => {
        const exists = current.some((customer) => customer.id === approvedCustomer.id)
        if (exists) {
          return current.map((customer) => (customer.id === approvedCustomer.id ? approvedCustomer : customer))
        }
        return [...current, approvedCustomer].sort((a, b) => {
          const aTime = new Date(a.vipExpiryDate || 0).getTime()
          const bTime = new Date(b.vipExpiryDate || 0).getTime()
          return aTime - bTime
        })
      })
      setRequestToApprove(null)
      setMessage('Đã duyệt đăng ký VIP online.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setApproving(false)
    }
  }

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
                <td>{customerUsername(customer)}</td>
                <td>{formatDate(customer.vipExpiryDate)}</td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan="3" className="vip-empty-cell">Không có khách hàng VIP phù hợp.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isManager && (
        <section className="panel table-panel vip-online-panel">
          <div className="vip-online-heading">
            <h2>Đăng ký VIP online</h2>
            <button
              className="ghost-button compact"
              type="button"
              onClick={() => loadOnlineRequests().catch((error) => setMessage(error.message))}
            >
              Làm mới
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Gói VIP</th>
                <th>Đã đăng ký</th>
              </tr>
            </thead>
            <tbody>
              {onlineRequests.map((item) => (
                <tr key={item.id}>
                  <td>{item.username}</td>
                  <td>{vipPackageLabel(item.years)}</td>
                  <td>
                    <input
                      className="vip-online-checkbox"
                      type="checkbox"
                      checked={false}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setRequestToApprove(item)
                        }
                      }}
                      aria-label={`Duyệt đăng ký VIP của ${item.username}`}
                    />
                  </td>
                </tr>
              ))}
              {onlineRequests.length === 0 && (
                <tr>
                  <td colSpan="3" className="vip-empty-cell">Không có đăng ký VIP online đang chờ duyệt.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {requestToApprove && (
        <div className="vip-confirm-backdrop" onClick={closeApproveModal}>
          <div className="vip-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Khách hàng này đã chuyển khoản?</h2>
            <p>{requestToApprove.username} - {vipPackageLabel(requestToApprove.years)}</p>
            <div className="vip-confirm-actions">
              <button className="vip-confirm-yes" type="button" onClick={approveOnlineRequest} disabled={approving}>
                {approving ? 'Đang xử lý...' : 'Yes'}
              </button>
              <button className="vip-confirm-no" type="button" onClick={closeApproveModal} disabled={approving}>
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
