import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import { formatCurrency } from '../../../utils/format'
import './ServicePOS.css'

function isVip(customer) {
  return Boolean(customer?.isVip) && (!customer.vipExpiryDate || new Date(customer.vipExpiryDate) >= new Date())
}

const emptyPaymentModal = {
  open: false,
  method: '',
  status: 'select',
  result: null,
}

export default function ServicePOS() {
  const [products, setProducts] = useState([])
  const [username, setUsername] = useState('')
  const [customer, setCustomer] = useState(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [message, setMessage] = useState('')
  const [paymentModal, setPaymentModal] = useState(emptyPaymentModal)

  async function loadProducts() {
    setProducts(await request('get', '/tickets/products'))
  }

  useEffect(() => {
    loadProducts().catch((error) => setMessage(error.message))
  }, [])

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return products.slice(0, 8)
    return products.filter((product) => product.name.toLowerCase().includes(keyword)).slice(0, 12)
  }, [products, search])

  const grossAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vipDiscount = isVip(customer) ? Math.round(grossAmount * 0.2) : 0
  const finalAmount = Math.max(0, grossAmount - vipDiscount)

  async function lookupCustomer() {
    setMessage('')
    setCustomer(null)
    const account = username.trim()
    if (!account) return

    try {
      setCustomer(await request('get', `/customers/lookup?username=${encodeURIComponent(account)}`))
    } catch {
      setMessage('Không tìm thấy tài khoản. Có thể tiếp tục thanh toán như khách vãng lai.')
    }
  }

  function updateUsername(event) {
    setUsername(event.target.value)
    setCustomer(null)
  }

  function addToCart(product) {
    if (product.stock <= 0) {
      setMessage('Sản phẩm đã hết tồn kho.')
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return current
        return current.map((item) => (
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ))
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(productId, delta) {
    setCart((current) => current
      .map((item) => {
        if (item.id !== productId) return item
        const nextQuantity = Math.min(item.stock, item.quantity + delta)
        return { ...item, quantity: nextQuantity }
      })
      .filter((item) => item.quantity > 0))
  }

  function removeItem(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
  }

  function openPaymentModal() {
    if (cart.length === 0) {
      setMessage('Vui lòng chọn ít nhất một sản phẩm.')
      return
    }
    setMessage('')
    setPaymentModal({ ...emptyPaymentModal, open: true })
  }

  function closePaymentModal() {
    const completed = paymentModal.status === 'done'
    setPaymentModal(emptyPaymentModal)
    if (completed) {
      setCart([])
      setSearch('')
      setMessage('Đã hoàn tất thanh toán riêng.')
    }
  }

  function selectPaymentMethod(method) {
    setPaymentModal((current) => ({
      ...current,
      method,
      status: 'confirm',
    }))
  }

  async function confirmPayment() {
    setPaymentModal((current) => ({ ...current, status: 'processing' }))
    try {
      const result = await request('post', '/tickets/service-orders', {
        username: customer ? username.trim() : undefined,
        paymentMethod: paymentModal.method,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
      })
      await loadProducts()
      setPaymentModal((current) => ({
        ...current,
        status: 'done',
        result,
      }))
    } catch (error) {
      setPaymentModal(emptyPaymentModal)
      setMessage(error.message)
    }
  }

  return (
    <section className="service-pos-page">
      <div className="service-pos-header">
        <h1>Thanh toán riêng</h1>
        <p>POS dành cho thu ngân khu vực bên trong.</p>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="service-pos-grid">
        <section className="service-pos-panel">
          <h2>Thông tin Khách hàng</h2>
          <div className="service-pos-customer-row">
            <label>
              <span>Nhập Username khách hàng</span>
              <input value={username} onChange={updateUsername} placeholder="Không bắt buộc" />
            </label>
            <button className="ghost-button" type="button" onClick={lookupCustomer}>Kiểm tra</button>
          </div>
          {isVip(customer) && (
            <p className="service-pos-vip">Khách hàng VIP - Áp dụng giảm 20% tổng bill</p>
          )}
          {!customer && (
            <p className="service-pos-help">Có thể bỏ trống Username để thanh toán cho khách vãng lai.</p>
          )}
        </section>

        <section className="service-pos-panel">
          <h2>Tìm kiếm sản phẩm</h2>
          <input
            className="service-pos-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm sản phẩm theo tên"
          />
          <div className="service-pos-results">
            {filteredProducts.map((product) => (
              <button type="button" key={product.id} onClick={() => addToCart(product)}>
                <strong>{product.name}</strong>
                <span>{formatCurrency(product.price)} · Tồn {product.stock}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="service-pos-panel service-pos-cart-panel">
          <h2>Giỏ hàng</h2>
          {cart.length === 0 ? (
            <p className="service-pos-empty">Chưa có sản phẩm trong giỏ hàng.</p>
          ) : (
            <div className="service-pos-cart-list">
              {cart.map((item) => (
                <div className="service-pos-cart-row" key={item.id}>
                  <strong>{item.name}</strong>
                  <div className="service-pos-counter">
                    <button type="button" onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                  <button className="service-pos-delete" type="button" onClick={() => removeItem(item.id)}>Xóa</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="service-pos-panel service-pos-checkout">
          <h2>Thanh toán dịch vụ</h2>
          <div className="service-pos-total">
            <span>Tổng số tiền phải thanh toán</span>
            <strong>{formatCurrency(finalAmount)}</strong>
          </div>
          {vipDiscount > 0 && <p>Đã trừ ưu đãi VIP 20%: -{formatCurrency(vipDiscount)}</p>}
          <button className="primary-button full" type="button" onClick={openPaymentModal}>
            Thanh toán
          </button>
        </section>
      </div>

      {paymentModal.open && (
        <div className="service-payment-backdrop" onClick={closePaymentModal}>
          <div className="service-payment-modal" onClick={(event) => event.stopPropagation()}>
            <button className="service-payment-close" type="button" onClick={closePaymentModal} aria-label="Đóng">X</button>

            {paymentModal.status === 'select' && (
              <>
                <h2>Hình thức thanh toán</h2>
                <p className="service-payment-amount">{formatCurrency(finalAmount)}</p>
                <div className="service-payment-methods">
                  <button type="button" onClick={() => selectPaymentMethod('Tiền mặt')}>Tiền mặt</button>
                  <button type="button" onClick={() => selectPaymentMethod('Chuyển khoản')}>Chuyển khoản</button>
                </div>
              </>
            )}

            {paymentModal.status === 'confirm' && (
              <>
                <h2>{paymentModal.method}</h2>
                {paymentModal.method === 'Chuyển khoản' ? (
                  <>
                    <p className="service-payment-label">Tổng số tiền phải chuyển</p>
                    <p className="service-payment-amount">{formatCurrency(finalAmount)}</p>
                    <img className="service-payment-qr" src="/myQR.jpg" alt="Mã QR chuyển khoản TinkerBell Garden" />
                  </>
                ) : (
                  <p className="service-payment-amount">{formatCurrency(finalAmount)}</p>
                )}
                <button className="primary-button full" type="button" onClick={confirmPayment}>
                  Xác nhận
                </button>
              </>
            )}

            {paymentModal.status === 'processing' && (
              <div className="service-payment-processing">
                <span className="service-payment-spinner" />
                <h2>Đang xử lý...</h2>
              </div>
            )}

            {paymentModal.status === 'done' && (
              <>
                <h2>Đã hoàn tất</h2>
                <p className="service-payment-amount">
                  {formatCurrency(paymentModal.result?.finalAmount ?? finalAmount)}
                </p>
                <button className="primary-button full" type="button" onClick={closePaymentModal}>
                  {paymentModal.method === 'Chuyển khoản' ? 'Xong' : 'OK'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
