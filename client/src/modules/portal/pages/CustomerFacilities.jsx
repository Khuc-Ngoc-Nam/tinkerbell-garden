import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { request } from '../../../services/api'
import ImageLightbox from '../components/ImageLightbox'
import './CustomerFacilities.css'

function statusLabel(status) {
  return {
    Normal: 'Hoạt động',
    Maintenance: 'Bảo trì',
    Broken: 'Tạm ngưng',
  }[status] || status || 'Chưa cập nhật'
}

function assetStatusLabel(assetStatus) {
  return assetStatus === 'Issue' ? 'CSVC cần xử lý' : 'CSVC OK'
}

export default function CustomerFacilities() {
  const { id } = useParams()
  const [facilities, setFacilities] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [lightboxImage, setLightboxImage] = useState(null)

  useEffect(() => {
    let active = true

    request('get', '/portal/info')
      .then((info) => {
        if (!active) return
        setFacilities(Array.isArray(info.facilities) ? info.facilities : [])
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

  const selectedFacility = useMemo(
    () => facilities.find((facility) => String(facility.id) === String(id)),
    [facilities, id],
  )

  function openLightbox(src, alt) {
    setLightboxImage({ src, alt })
  }

  function openLightboxFromKeyboard(event, src, alt) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      openLightbox(src, alt)
    }
  }

  return (
    <main className="customer-view">
      <section className="customer-hero">
        <Link className="customer-back-link" to="/">
          Quay lại trang chủ
        </Link>
        <div>
          <span className="customer-kicker">TinkerBell Garden</span>
          <h1>{selectedFacility?.name || 'Chi tiết khu vui chơi'}</h1>
          <p>
            Xem hình ảnh, mô tả, sức chứa và tình trạng vận hành hiện tại của khu vui chơi.
          </p>
        </div>
      </section>

      {loading && <p className="customer-message">Đang tải thông tin khu vui chơi...</p>}
      {message && <p className="customer-message">{message}</p>}

      {!loading && !message && !selectedFacility && (
        <section className="customer-layout customer-layout-single">
          <article className="customer-detail-card">
            <div className="customer-detail-body">
              <h2>Không tìm thấy khu vui chơi</h2>
              <p>Khu vui chơi này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
              <Link className="customer-back-link inline" to="/">
                Xem các khu vui chơi khác
              </Link>
            </div>
          </article>
        </section>
      )}

      {!loading && !message && selectedFacility && (
        <section className="customer-layout customer-layout-single">
          <article className="customer-detail-card">
            {selectedFacility.imageUrl ? (
              <button
                className="customer-image-button"
                type="button"
                onClick={() => openLightbox(selectedFacility.imageUrl, selectedFacility.name)}
              >
                <img className="customer-detail-image" src={selectedFacility.imageUrl} alt={selectedFacility.name} />
              </button>
            ) : (
              <div className="customer-detail-placeholder">Chưa có hình ảnh khu vui chơi</div>
            )}

            <div className="customer-detail-body">
              <h2>{selectedFacility.name}</h2>
              <p>{selectedFacility.description || 'Khu này chưa có mô tả chi tiết.'}</p>

              <div className="customer-facility-meta">
                <div>
                  <span>Sức chứa</span>
                  <strong>{selectedFacility.capacity || 0} khách</strong>
                </div>
                <div>
                  <span>Tình trạng</span>
                  <strong>{statusLabel(selectedFacility.status)}</strong>
                </div>
                <div>
                  <span>CSVC</span>
                  <strong>{assetStatusLabel(selectedFacility.assetStatus)}</strong>
                </div>
              </div>

            </div>
          </article>

          <section className="customer-service-box">
            <div className="customer-service-heading">
              <h2>Một vài trò chơi tính phí thêm</h2>
              <p>Chọn một dịch vụ để xem sản phẩm, giá tiền và tồn kho hiện tại.</p>
            </div>

            {(selectedFacility.services || []).length > 0 ? (
              <div className="customer-service-grid">
                {selectedFacility.services.map((service) => (
                  <Link className="customer-service-card" to={`/service/${service.id}`} key={service.id}>
                    {service.imageUrl ? (
                      <span
                        className="customer-service-image-trigger"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openLightbox(service.imageUrl, service.name)
                        }}
                        onKeyDown={(event) => openLightboxFromKeyboard(event, service.imageUrl, service.name)}
                      >
                        <img src={service.imageUrl} alt={service.name} />
                      </span>
                    ) : (
                      <span className="customer-service-placeholder">Chưa có ảnh</span>
                    )}
                    <div>
                      <h3>{service.name}</h3>
                      <p>{service.description || `${service.products?.length || 0} sản phẩm tính phí`}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="customer-service-empty">Khu này chưa có dịch vụ tính phí thêm.</p>
            )}
          </section>
        </section>
      )}
      <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </main>
  )
}
