import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import { formatCurrency, formatDate, toTimestamp } from '../../../utils/format'
import './ReportDashboard.css'

const emptyDashboard = {
  ticketTypes: [],
  facilities: [],
  gatePayments: [],
  servicePayments: [],
  playHistory: [],
  vipTransactions: [],
  eventTransactions: [],
}

const initialFilters = {
  from: '',
  to: '',
  customer: '',
  paymentMethod: 'all',
  ticketTypeId: 'all',
  product: '',
  facilityId: 'all',
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function localTime(value) {
  if (!value) return null
  const timestamp = toTimestamp(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function dayBound(value, endOfDay = false) {
  if (!value) return null
  return toTimestamp(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
}

function sumRows(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0)
}

function customerText(row) {
  return normalize(`${row.customerName || ''} ${row.username || ''}`)
}

function latestTime(a, b) {
  return localTime(a) > localTime(b) ? a : b
}

export default function ReportDashboard() {
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [filters, setFilters] = useState(initialFilters)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    request('get', '/reports/dashboard')
      .then((data) => {
        if (active) setDashboard({ ...emptyDashboard, ...data })
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
  }, [])

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function clearFilters() {
    setFilters(initialFilters)
  }

  const filterFns = useMemo(() => {
    const fromTime = dayBound(filters.from)
    const toTime = dayBound(filters.to, true)
    const customer = normalize(filters.customer)
    const product = normalize(filters.product)

    const matchDate = (value) => {
      const timestamp = localTime(value)
      if (!timestamp) return false
      if (fromTime && timestamp < fromTime) return false
      if (toTime && timestamp > toTime) return false
      return true
    }

    const matchCustomer = (row) => !customer || customerText(row).includes(customer)
    const matchPayment = (row) => filters.paymentMethod === 'all' || row.paymentMethod === filters.paymentMethod
    const matchTicket = (row) => filters.ticketTypeId === 'all' || String(row.ticketTypeId || '') === filters.ticketTypeId
    const matchProduct = (row) => !product || normalize(row.productName).includes(product)
    const matchFacility = (row) => filters.facilityId === 'all' || String(row.facilityId || '') === filters.facilityId

    return {
      matchDate,
      matchCustomer,
      matchPayment,
      matchTicket,
      matchProduct,
      matchFacility,
      hasServiceFilter: Boolean(product) || filters.facilityId !== 'all',
    }
  }, [filters])

  const serviceRowsForCrossFilter = useMemo(() => dashboard.servicePayments.filter((row) => (
    filterFns.matchDate(row.paidAt)
    && filterFns.matchCustomer(row)
    && filterFns.matchPayment(row)
    && filterFns.matchTicket(row)
    && filterFns.matchProduct(row)
    && filterFns.matchFacility(row)
  )), [dashboard.servicePayments, filterFns])

  const serviceSessionIds = useMemo(
    () => new Set(serviceRowsForCrossFilter.map((row) => row.sessionId).filter(Boolean)),
    [serviceRowsForCrossFilter],
  )

  const gatePayments = useMemo(() => dashboard.gatePayments.filter((row) => (
    filterFns.matchDate(row.paidAt)
    && filterFns.matchCustomer(row)
    && filterFns.matchPayment(row)
    && filterFns.matchTicket(row)
    && (!filterFns.hasServiceFilter || serviceSessionIds.has(row.sessionId))
  )), [dashboard.gatePayments, filterFns, serviceSessionIds])

  const servicePayments = useMemo(() => {
    const grouped = serviceRowsForCrossFilter.reduce((map, row) => {
      const key = [
        row.orderId || row.sessionId || row.id,
        row.customerName,
        row.username,
        row.facilityId,
        row.productId,
        row.paymentMethod,
      ].join('|')
      const current = map.get(key) || {
        ...row,
        quantity: 0,
        amount: 0,
      }
      current.quantity += Number(row.quantity || 0)
      current.amount += Number(row.amount || 0)
      current.paidAt = latestTime(current.paidAt, row.paidAt)
      map.set(key, current)
      return map
    }, new Map())

    return Array.from(grouped.values())
      .sort((a, b) => (localTime(b.paidAt) || 0) - (localTime(a.paidAt) || 0))
  }, [serviceRowsForCrossFilter])

  const playHistory = useMemo(() => dashboard.playHistory.filter((row) => (
    filterFns.matchDate(row.checkoutTime || row.paidAt)
    && filterFns.matchCustomer(row)
    && filterFns.matchTicket(row)
    && (!row.paymentMethod || filterFns.matchPayment(row))
    && (!filterFns.hasServiceFilter || serviceSessionIds.has(row.sessionId))
  )), [dashboard.playHistory, filterFns, serviceSessionIds])

  const vipTransactions = useMemo(() => dashboard.vipTransactions.filter((row) => (
    filterFns.matchDate(row.paidAt)
    && filterFns.matchCustomer(row)
    && filterFns.matchPayment(row)
  )), [dashboard.vipTransactions, filterFns])

  const eventTransactions = useMemo(() => dashboard.eventTransactions.filter((row) => (
    filterFns.matchDate(row.paidAt)
    && filterFns.matchCustomer(row)
    && filterFns.matchPayment(row)
  )), [dashboard.eventTransactions, filterFns])

  const totals = useMemo(() => {
    const ticketRevenue = sumRows(gatePayments, 'ticketAmount')
    const gateRevenue = sumRows(gatePayments, 'amount')
    const overtimeRevenue = sumRows(playHistory, 'overtimeAmount')
    const playHistoryRevenue = sumRows(playHistory, 'amount')
    const serviceRevenue = sumRows(servicePayments, 'amount')
    const vipRevenue = sumRows(vipTransactions, 'amount')
    const eventRevenue = sumRows(eventTransactions, 'amount')
    return {
      gateQuantity: sumRows(gatePayments, 'quantity'),
      gateTicketRevenue: ticketRevenue,
      gateRevenue,
      serviceQuantity: sumRows(servicePayments, 'quantity'),
      serviceRevenue,
      overtimeRevenue,
      playHistoryRevenue,
      vipRevenue,
      eventRevenue,
      eventCustomerCount: eventTransactions.length,
      totalRevenue: ticketRevenue + overtimeRevenue + serviceRevenue + vipRevenue + eventRevenue,
    }
  }, [eventTransactions, gatePayments, playHistory, servicePayments, vipTransactions])

  return (
    <section className="report-dashboard">
      <div className="report-dashboard-heading">
        <div>
          <h1>Báo cáo & Thống kê</h1>
        </div>
        <button className="ghost-button compact" type="button" onClick={clearFilters}>
          Xóa lọc
        </button>
      </div>

      {message && <p className="notice">{message}</p>}
      {loading && <p className="notice">Đang tải dữ liệu báo cáo...</p>}

      <section className="report-filter-panel" aria-label="Bộ lọc báo cáo">
        <label>
          <span>Từ ngày</span>
          <input name="from" type="date" value={filters.from} onChange={updateFilter} />
        </label>
        <label>
          <span>Đến ngày</span>
          <input name="to" type="date" value={filters.to} onChange={updateFilter} />
        </label>
        <label>
          <span>Tìm kiếm Khách hàng</span>
          <input
            name="customer"
            value={filters.customer}
            onChange={updateFilter}
            placeholder="Username hoặc tên khách"
          />
        </label>
        <label>
          <span>Phương thức thanh toán</span>
          <select name="paymentMethod" value={filters.paymentMethod} onChange={updateFilter}>
            <option value="all">Tất cả</option>
            <option value="Tiền mặt">Tiền mặt</option>
            <option value="Chuyển khoản">Chuyển khoản</option>
          </select>
        </label>
        <label>
          <span>Loại vé</span>
          <select name="ticketTypeId" value={filters.ticketTypeId} onChange={updateFilter}>
            <option value="all">Tất cả</option>
            {dashboard.ticketTypes.map((ticket) => (
              <option value={ticket.id} key={ticket.id}>{ticket.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Sản phẩm</span>
          <input
            name="product"
            value={filters.product}
            onChange={updateFilter}
            placeholder="Tên sản phẩm"
          />
        </label>
        <label>
          <span>Khu vui chơi</span>
          <select name="facilityId" value={filters.facilityId} onChange={updateFilter}>
            <option value="all">Tất cả</option>
            {dashboard.facilities.map((facility) => (
              <option value={facility.id} key={facility.id}>{facility.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="report-table-card">
        <h2>Lịch sử thanh toán cổng vào</h2>
        <div className="report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Loại vé</th>
                <th>Số lượng</th>
                <th>Phương thức thanh toán</th>
                <th>Số tiền</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {gatePayments.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.customerName}</strong>
                    {row.username && <span>{row.username}</span>}
                  </td>
                  <td>{row.ticketType}</td>
                  <td>{row.quantity}</td>
                  <td>{row.paymentMethod}</td>
                  <td>{formatCurrency(row.amount)}</td>
                  <td>{formatDate(row.paidAt)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2">Tổng</td>
                <td>Tổng số lượng: {totals.gateQuantity}</td>
                <td />
                <td>Tổng doanh thu: {formatCurrency(totals.gateRevenue)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="report-table-card">
        <h2>Lịch sử thanh toán dịch vụ tính phí</h2>
        <div className="report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Khu vui chơi</th>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Phương thức thanh toán</th>
                <th>Số tiền</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {servicePayments.map((row) => (
                <tr key={`${row.orderId || row.sessionId || row.id}-${row.productId}-${row.paymentMethod}`}>
                  <td>
                    <strong>{row.customerName}</strong>
                    {row.username && <span>{row.username}</span>}
                  </td>
                  <td>{row.facilityName}</td>
                  <td>{row.productName}</td>
                  <td>{row.quantity}</td>
                  <td>{row.paymentMethod}</td>
                  <td>{formatCurrency(row.amount)}</td>
                  <td>{formatDate(row.paidAt)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3">Tổng</td>
                <td>Tổng số lượng: {totals.serviceQuantity}</td>
                <td />
                <td>Tổng doanh thu: {formatCurrency(totals.serviceRevenue)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="report-table-card">
        <h2>Lịch sử lượt chơi</h2>
        <div className="report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Loại vé</th>
                <th>Giờ vào</th>
                <th>Giờ ra</th>
                <th>Quá giờ</th>
                <th>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {playHistory.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.customerName}</strong>
                    {row.username && <span>{row.username}</span>}
                  </td>
                  <td>{row.ticketType}</td>
                  <td>{formatDate(row.checkinTime)}</td>
                  <td>{formatDate(row.checkoutTime)}</td>
                  <td>
                    {row.overtimeMinutes > 0
                      ? `${row.overtimeMinutes} phút / ${row.overtimeBlocks} block`
                      : 'Không quá giờ'}
                  </td>
                  <td>{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5">Tổng số tiền</td>
                <td>Tổng doanh thu: {formatCurrency(totals.playHistoryRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="report-table-card">
        <h2>Thống kê doanh thu sự kiện</h2>
        <div className="report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sự kiện</th>
                <th>Khách hàng</th>
                <th>Giờ vào</th>
                <th>Giờ ra</th>
                <th>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {eventTransactions.map((row) => (
                <tr key={row.id}>
                  <td>{row.eventName}</td>
                  <td>
                    <strong>{row.customerName}</strong>
                    {row.username && <span>{row.username}</span>}
                  </td>
                  <td>{row.checkinTime ? formatDate(row.checkinTime) : 'Chưa check-in'}</td>
                  <td>{row.checkoutTime ? formatDate(row.checkoutTime) : 'Chưa check-out'}</td>
                  <td>{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Tổng</td>
                <td>Tổng khách hàng: {totals.eventCustomerCount}</td>
                <td />
                <td />
                <td>Tổng số tiền: {formatCurrency(totals.eventRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="report-table-card report-summary-card">
        <h2>Doanh thu Tổng hợp</h2>
        <div className="report-table-wrap">
          <table className="report-summary-table">
            <thead>
              <tr>
                <th>Vé vào cửa</th>
                <th>Phí quá giờ</th>
                <th>Dịch vụ phát sinh</th>
                <th>Đăng ký/Gia hạn VIP</th>
                <th>Sự kiện</th>
                <th>Tổng doanh thu</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatCurrency(totals.gateTicketRevenue)}</td>
                <td>{formatCurrency(totals.overtimeRevenue)}</td>
                <td>{formatCurrency(totals.serviceRevenue)}</td>
                <td>{formatCurrency(totals.vipRevenue)}</td>
                <td>{formatCurrency(totals.eventRevenue)}</td>
                <td>{formatCurrency(totals.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
