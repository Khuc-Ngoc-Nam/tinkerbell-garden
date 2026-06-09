import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { request } from '../../../services/api'
import { formatCurrency } from '../../../utils/format'
import ImageLightbox from '../components/ImageLightbox'
import './ServiceProducts.css'

export default function ServiceProducts() {
  const { serviceId } = useParams()
  const [service, setService] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [lightboxImage, setLightboxImage] = useState(null)

  useEffect(() => {
    let active = true

    request('get', `/portal/services/${serviceId}`)
      .then((data) => {
        if (active) setService(data)
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
  }, [serviceId])

  const heroStyle = service?.imageUrl
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.42)), url("${service.imageUrl}")`,
      }
    : undefined

  return (
    <main className="service-products-page">
      <section className={`service-products-hero ${service?.imageUrl ? 'has-background' : ''}`} style={heroStyle}>
        {service?.imageUrl && (
          <button
            className="service-products-hero-open"
            type="button"
            onClick={() => setLightboxImage({ src: service.imageUrl, alt: service.name })}
            aria-label={`Phóng to ảnh ${service.name}`}
          />
        )}
        <Link className="service-products-back" to={service?.facilityId ? `/facility/${service.facilityId}` : '/'}>
          Quay lại khu vui chơi
        </Link>

        {loading && <p className="service-products-message">Đang tải dịch vụ...</p>}
        {message && <p className="service-products-message is-error">{message}</p>}

        {!loading && !message && service && (
          <article className="service-products-intro">
            <div>
              <span>{service.facilityName}</span>
              <h1>{service.name}</h1>
              {service.description && <p>{service.description}</p>}
            </div>
          </article>
        )}
      </section>

      {!loading && !message && service && (
        <section className="service-products-section">
          <div className="service-products-heading">
            <h2>Sản phẩm</h2>
          </div>

          {(service.products || []).length > 0 ? (
            <div className="service-products-grid">
              {service.products.map((product) => (
                <article className="service-product-card" key={product.id}>
                  {product.imageUrl ? (
                    <button
                      className="service-product-image-button"
                      type="button"
                      onClick={() => setLightboxImage({ src: product.imageUrl, alt: product.name })}
                    >
                      <img src={product.imageUrl} alt={product.name} />
                    </button>
                  ) : (
                    <div className="service-product-placeholder">Chưa có ảnh</div>
                  )}
                  <div className="service-product-body">
                    <h3>{product.name}</h3>
                    <div className="service-product-meta">
                      <span>Giá</span>
                      <strong>{formatCurrency(product.price)}</strong>
                    </div>
                    <div className="service-product-meta">
                      <span>Tồn kho</span>
                      <strong>{product.stock}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="service-products-empty">Dịch vụ này chưa có sản phẩm nào.</p>
          )}
        </section>
      )}
      <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </main>
  )
}
