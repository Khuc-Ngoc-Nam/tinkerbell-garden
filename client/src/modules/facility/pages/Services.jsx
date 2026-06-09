import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import { formatCurrency } from '../../../utils/format'
import './Services.css'

const blankUpdateForm = {
  facilityId: '',
  serviceId: '',
  productId: '',
  price: '',
  stock: '',
  image: null,
}

const blankServiceForm = {
  facilityId: '',
  name: '',
  image: null,
}

const blankProductForm = {
  facilityId: '',
  serviceId: '',
  name: '',
  price: '',
  stock: '',
  image: null,
}

function buildFormData(payload) {
  const data = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      data.append(key, value)
    }
  })
  return data
}

export default function Services() {
  const [facilities, setFacilities] = useState([])
  const [paidServices, setPaidServices] = useState([])
  const [products, setProducts] = useState([])
  const [mode, setMode] = useState('update')
  const [updateForm, setUpdateForm] = useState(blankUpdateForm)
  const [serviceForm, setServiceForm] = useState(blankServiceForm)
  const [productForm, setProductForm] = useState(blankProductForm)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const servicesByFacility = useMemo(
    () => paidServices.filter((service) => String(service.facilityId) === String(updateForm.facilityId)),
    [paidServices, updateForm.facilityId],
  )

  const productsByService = useMemo(
    () => products.filter((product) => String(product.serviceId) === String(updateForm.serviceId)),
    [products, updateForm.serviceId],
  )

  const addProductServices = useMemo(
    () => paidServices.filter((service) => String(service.facilityId) === String(productForm.facilityId)),
    [paidServices, productForm.facilityId],
  )

  async function loadData() {
    setLoading(true)
    const [facilityRows, serviceRows, productRows] = await Promise.all([
      request('get', '/facilities'),
      request('get', '/facilities/paid-services/services'),
      request('get', '/facilities/paid-services/items'),
    ])

    setFacilities(facilityRows)
    setPaidServices(serviceRows)
    setProducts(productRows)

    const firstFacilityId = facilityRows[0]?.id ? String(facilityRows[0].id) : ''
    const firstService = serviceRows.find((service) => String(service.facilityId) === firstFacilityId)
    const firstProduct = productRows.find((product) => String(product.serviceId) === String(firstService?.id))

    setUpdateForm({
      facilityId: firstFacilityId,
      serviceId: firstService?.id ? String(firstService.id) : '',
      productId: firstProduct?.id ? String(firstProduct.id) : '',
      price: firstProduct?.price ?? '',
      stock: firstProduct?.stock ?? '',
      image: null,
    })
    setServiceForm((current) => ({ ...current, facilityId: current.facilityId || firstFacilityId }))
    setProductForm((current) => ({
      ...current,
      facilityId: current.facilityId || firstFacilityId,
      serviceId: current.serviceId || (firstService?.id ? String(firstService.id) : ''),
    }))
    setLoading(false)
  }

  useEffect(() => {
    loadData().catch((error) => {
      setMessage(error.message)
      setLoading(false)
    })
  }, [])

  function switchMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    if (nextMode === 'create-service') {
      setServiceForm({ ...blankServiceForm, facilityId: facilities[0]?.id ? String(facilities[0].id) : '' })
    }
    if (nextMode === 'create-product') {
      const firstFacilityId = facilities[0]?.id ? String(facilities[0].id) : ''
      const firstService = paidServices.find((service) => String(service.facilityId) === firstFacilityId)
      setProductForm({
        ...blankProductForm,
        facilityId: firstFacilityId,
        serviceId: firstService?.id ? String(firstService.id) : '',
      })
    }
  }

  function updateSelectedFacility(facilityId) {
    const nextService = paidServices.find((service) => String(service.facilityId) === String(facilityId))
    const nextProduct = products.find((product) => String(product.serviceId) === String(nextService?.id))
    setUpdateForm({
      facilityId,
      serviceId: nextService?.id ? String(nextService.id) : '',
      productId: nextProduct?.id ? String(nextProduct.id) : '',
      price: nextProduct?.price ?? '',
      stock: nextProduct?.stock ?? '',
      image: null,
    })
  }

  function updateSelectedService(serviceId) {
    const nextProduct = products.find((product) => String(product.serviceId) === String(serviceId))
    setUpdateForm((current) => ({
      ...current,
      serviceId,
      productId: nextProduct?.id ? String(nextProduct.id) : '',
      price: nextProduct?.price ?? '',
      stock: nextProduct?.stock ?? '',
      image: null,
    }))
  }

  function updateSelectedProduct(productId) {
    const product = products.find((item) => String(item.id) === String(productId))
    setUpdateForm((current) => ({
      ...current,
      productId,
      price: product?.price ?? '',
      stock: product?.stock ?? '',
      image: null,
    }))
  }

  function updateServiceFacility(facilityId) {
    setServiceForm((current) => ({ ...current, facilityId }))
  }

  function updateProductFacility(facilityId) {
    const firstService = paidServices.find((service) => String(service.facilityId) === String(facilityId))
    setProductForm((current) => ({
      ...current,
      facilityId,
      serviceId: firstService?.id ? String(firstService.id) : '',
    }))
  }

  async function submitUpdate(event) {
    event.preventDefault()
    if (!updateForm.productId) {
      setMessage('Vui lòng chọn sản phẩm cần cập nhật')
      return
    }

    try {
      await request('put', `/facilities/paid-services/items/${updateForm.productId}`, buildFormData({
        serviceId: Number(updateForm.serviceId),
        price: Number(updateForm.price),
        stock: Number(updateForm.stock),
        image: updateForm.image,
      }))
      setMessage('Đã cập nhật sản phẩm')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function submitService(event) {
    event.preventDefault()
    try {
      await request('post', '/facilities/paid-services/services', buildFormData({
        facilityId: serviceForm.facilityId,
        name: serviceForm.name.trim(),
        image: serviceForm.image,
      }))
      setMessage('Đã thêm dịch vụ')
      setMode('update')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function submitProduct(event) {
    event.preventDefault()
    try {
      await request('post', '/facilities/paid-services/items', buildFormData({
        facilityId: productForm.facilityId,
        serviceId: productForm.serviceId,
        name: productForm.name.trim(),
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        image: productForm.image,
      }))
      setMessage('Đã thêm sản phẩm')
      setMode('update')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) return

    try {
      await request('delete', `/facilities/paid-services/items/${product.id}`)
      setMessage('Đã xóa sản phẩm')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  function renderUpdateForm() {
    return (
      <form className="paid-service-form" onSubmit={submitUpdate}>
        <h2>Cập nhật bảng giá</h2>

        <label className="paid-service-field">
          <span>Khu vui chơi</span>
          <select value={updateForm.facilityId} onChange={(event) => updateSelectedFacility(event.target.value)} required>
            <option value="">Chọn khu vui chơi</option>
            {facilities.map((facility) => (
              <option value={facility.id} key={facility.id}>{facility.name}</option>
            ))}
          </select>
        </label>

        <label className="paid-service-field">
          <span>Dịch vụ</span>
          <select value={updateForm.serviceId} onChange={(event) => updateSelectedService(event.target.value)} required>
            <option value="">Chọn dịch vụ</option>
            {servicesByFacility.map((service) => (
              <option value={service.id} key={service.id}>{service.name}</option>
            ))}
          </select>
        </label>

        <label className="paid-service-field">
          <span>Sản phẩm</span>
          <select value={updateForm.productId} onChange={(event) => updateSelectedProduct(event.target.value)} required>
            <option value="">Chọn sản phẩm</option>
            {productsByService.map((product) => (
              <option value={product.id} key={product.id}>{product.name}</option>
            ))}
          </select>
        </label>

        <div className="paid-service-form-row">
          <label className="paid-service-field">
            <span>Giá</span>
            <input
              type="number"
              min="0"
              value={updateForm.price}
              onChange={(event) => setUpdateForm((current) => ({ ...current, price: event.target.value }))}
              required
            />
          </label>

          <label className="paid-service-field">
            <span>Tồn kho</span>
            <input
              type="number"
              min="0"
              value={updateForm.stock}
              onChange={(event) => setUpdateForm((current) => ({ ...current, stock: event.target.value }))}
              required
            />
          </label>
        </div>

        <label className="paid-service-field">
          <span>Update ảnh</span>
          <input
            key={updateForm.productId}
            type="file"
            accept="image/*"
            onChange={(event) => setUpdateForm((current) => ({
              ...current,
              image: event.target.files?.[0] || null,
            }))}
          />
        </label>
        <button className="paid-service-submit" type="submit">Cập nhật</button>
      </form>
    )
  }

  function renderCreateServiceForm() {
    return (
      <form className="paid-service-form" onSubmit={submitService}>
        <h2>Thêm dịch vụ</h2>

        <label className="paid-service-field">
          <span>Chọn khu vui chơi</span>
          <select value={serviceForm.facilityId} onChange={(event) => updateServiceFacility(event.target.value)} required>
            <option value="">Chọn khu vui chơi</option>
            {facilities.map((facility) => (
              <option value={facility.id} key={facility.id}>{facility.name}</option>
            ))}
          </select>
        </label>

        <label className="paid-service-field">
          <span>Nhập tên dịch vụ</span>
          <input
            value={serviceForm.name}
            onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ví dụ: Tô tượng"
            required
          />
        </label>

        <label className="paid-service-field">
          <span>Tải ảnh lên</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setServiceForm((current) => ({ ...current, image: event.target.files?.[0] || null }))}
          />
        </label>

        <button className="paid-service-submit" type="submit">Thêm dịch vụ</button>
      </form>
    )
  }

  function renderCreateProductForm() {
    return (
      <form className="paid-service-form" onSubmit={submitProduct}>
        <h2>Thêm sản phẩm</h2>

        <label className="paid-service-field">
          <span>Khu vui chơi</span>
          <select value={productForm.facilityId} onChange={(event) => updateProductFacility(event.target.value)} required>
            <option value="">Chọn khu vui chơi</option>
            {facilities.map((facility) => (
              <option value={facility.id} key={facility.id}>{facility.name}</option>
            ))}
          </select>
        </label>

        <label className="paid-service-field">
          <span>Dịch vụ</span>
          <select
            value={productForm.serviceId}
            onChange={(event) => setProductForm((current) => ({ ...current, serviceId: event.target.value }))}
            required
          >
            <option value="">Chọn dịch vụ</option>
            {addProductServices.map((service) => (
              <option value={service.id} key={service.id}>{service.name}</option>
            ))}
          </select>
        </label>

        <label className="paid-service-field">
          <span>Sản phẩm</span>
          <input
            value={productForm.name}
            onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ví dụ: Tô tượng size nhỏ"
            required
          />
        </label>

        <div className="paid-service-form-row">
          <label className="paid-service-field">
            <span>Giá</span>
            <input
              type="number"
              min="0"
              value={productForm.price}
              onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
              required
            />
          </label>

          <label className="paid-service-field">
            <span>Số lượng</span>
            <input
              type="number"
              min="0"
              value={productForm.stock}
              onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))}
              required
            />
          </label>
        </div>

        <label className="paid-service-field">
          <span>Tải ảnh lên</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.files?.[0] || null }))}
          />
        </label>

        <button className="paid-service-submit" type="submit">Thêm sản phẩm</button>
      </form>
    )
  }

  return (
    <section className="paid-services-page">
      <div className="paid-services-header">
        <div>
          <span className="paid-services-kicker">TinkerBell Garden</span>
          <h1>Dịch vụ tính phí</h1>
        </div>
        <div className="paid-services-actions">
          <button type="button" onClick={() => switchMode('create-service')}>+ Thêm dịch vụ</button>
          <button type="button" onClick={() => switchMode('create-product')}>+ Thêm sản phẩm</button>
        </div>
      </div>

      {message && <p className="paid-service-message">{message}</p>}

      <div className="paid-service-layout">
        <aside className="paid-service-card">
          {mode === 'update' && renderUpdateForm()}
          {mode === 'create-service' && renderCreateServiceForm()}
          {mode === 'create-product' && renderCreateProductForm()}

          {mode !== 'update' && (
            <button className="paid-service-back-button" type="button" onClick={() => switchMode('update')}>
              Quay lại cập nhật
            </button>
          )}
        </aside>

        <section className="paid-service-card paid-service-table-card">
          <div className="paid-service-table-heading">
            <h2>Các dịch vụ tính phí</h2>
            {loading && <span>Đang tải...</span>}
          </div>

          <div className="paid-service-table-wrap">
            <table className="paid-service-table">
              <thead>
                <tr>
                  <th>Khu vui chơi</th>
                  <th>Dịch vụ</th>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Hình ảnh</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.facilityName || '-'}</td>
                    <td>{product.serviceName || product.category}</td>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>{product.stock}</td>
                    <td>
                      {product.imageUrl ? (
                        <img className="paid-service-thumb" src={product.imageUrl} alt={product.name} />
                      ) : product.serviceImageUrl ? (
                        <img className="paid-service-thumb" src={product.serviceImageUrl} alt={product.serviceName} />
                      ) : (
                        <span className="paid-service-empty-thumb">Chưa có ảnh</span>
                      )}
                    </td>
                    <td>
                      <div className="paid-service-row-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setMode('update')
                            setUpdateForm({
                              facilityId: product.facilityId ? String(product.facilityId) : '',
                              serviceId: product.serviceId ? String(product.serviceId) : '',
                              productId: String(product.id),
                              price: product.price,
                              stock: product.stock,
                              image: null,
                            })
                          }}
                        >
                          Sửa
                        </button>
                        <button type="button" className="danger" onClick={() => deleteProduct(product)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && products.length === 0 && (
                  <tr>
                    <td colSpan="7" className="paid-service-empty-row">
                      Chưa có sản phẩm tính phí trong khu vực được phân quyền.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}
