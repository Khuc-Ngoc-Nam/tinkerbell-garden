import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import { formatCurrency } from '../../../utils/format'
import './ServicePOS.css'

function isVip(customer) {
  return Boolean(customer?.isVip) && (!customer.vipExpiryDate || new Date(customer.vipExpiryDate) >= new Date())
}

export default function ServicePOS() {
  const [products, setProducts] = useState([])
  const [username, setUsername] = useState('')
  const [customer, setCustomer] = useState(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [message, setMessage] = useState('')

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

  async function lookupCustomer() {
    setMessage('')
    setCustomer(null)
    const account = username.trim()
    if (!account) return

    try {
      setCustomer(await request('get', `/customers/lookup?username=${encodeURIComponent(account)}`))
    } catch {
      setMessage('Không tìm thấy khách hàng theo username này.')
    }
  }

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) => (
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ))
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(productId, delta) {
    setCart((current) => current
      .map((item) => (
        item.id === productId ? { ...item, quantity: item.quantity + delta } : item
      ))
      .filter((item) => item.quantity > 0))
  }

  function removeItem(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
  }

  async function addToSessionBill() {
    if (cart.length === 0) {
      setMessage('Vui lòng chọn ít nhất một sản phẩm.')
      return
    }
    if (!username.trim()) {
      setMessage('Vui lòng nhập Username khách để cộng dịch vụ vào lượt đang chơi.')
      return
    }
    try {
      await request('post', '/tickets/service-orders', {
        username: username.trim() || undefined,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
      })
      setCart([])
      setSearch('')
      setMessage('Đã cộng dịch vụ vào bill Check-out của khách.')
      await loadProducts()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <section className="service-pos-page">
      <div className="service-pos-header">
        <h1>Thanh toán</h1>
        <p>POS dành cho thu ngân khu vực bên trong.</p>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="service-pos-grid">
        <section className="service-pos-panel">
          <h2>Thông tin Khách hàng</h2>
          <div className="service-pos-customer-row">
            <label>
              <span>Nhập Username khách hàng</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <button className="ghost-button" type="button" onClick={lookupCustomer}>Kiểm tra</button>
          </div>
          {isVip(customer) && (
            <p className="service-pos-vip">Khách hàng VIP - Áp dụng giảm 20% tổng bill</p>
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
          <h2>Ghi nhận dịch vụ</h2>
          <div className="service-pos-total">
            <span>Tổng tiền sẽ cộng vào bill Check-out</span>
            <strong>{formatCurrency(grossAmount)}</strong>
          </div>
          {isVip(customer) && <p>Ưu đãi VIP 20% sẽ được áp dụng khi khách Check-out.</p>}
          <button className="primary-button full" type="button" onClick={addToSessionBill}>
            Ghi vào bill Check-out
          </button>
        </section>
      </div>
    </section>
  )
}
