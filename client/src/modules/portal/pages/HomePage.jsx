import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../../../services/api'
import { formatCurrency, formatDate } from '../../../utils/format'
import ImageLightbox from '../components/ImageLightbox'
import './HomePage.css'

function statusLabel(status) {
  return {
    Normal: 'Hoạt động',
    Broken: 'Tạm ngưng',
    Maintenance: 'Bảo trì',
  }[status] || status || 'Đang cập nhật'
}

function handleBookTicket() {
  alert('Tính năng đang được phát triển')
}

export default function HomePage() {
  const [parkInfo, setParkInfo] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [lightboxImage, setLightboxImage] = useState(null)

  useEffect(() => {
    let active = true

    request('get', '/portal/info')
      .then((data) => {
        if (!active) return
        setParkInfo(data)
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

  const facilities = Array.isArray(parkInfo?.facilities) ? parkInfo.facilities : []
  const events = Array.isArray(parkInfo?.events) ? parkInfo.events : []
  const ticketPrices = Array.isArray(parkInfo?.ticketPrices) ? parkInfo.ticketPrices : []

  return (
    <main className="home-page">
      <header className="home-header">
        <Link className="home-brand" to="/" aria-label="TinkerBell Garden">
          TinkerBell Garden
        </Link>
        <button className="home-login-placeholder" type="button" onClick={handleBookTicket}>
          Đặt vé
        </button>
      </header>

      <section className="home-hero" aria-label="TinkerBell Garden">
        <div className="home-flying-bird home-flying-bird-left" aria-hidden="true">
          <span />
        </div>
        <div className="home-flying-bird home-flying-bird-right" aria-hidden="true">
          <span />
        </div>
        <div className="home-castle" aria-hidden="true" />
        <div className="home-forest" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="home-flower-row" aria-hidden="true" />

        <div className="home-hero-content">
          <video
            className="home-hero-video"
            src="/Animate_this_paper_cut_out_col.mp4"
            autoPlay
            loop
            muted
            playsInline
            aria-label={parkInfo?.name || 'TinkerBell Garden'}
          />
        </div>
      </section>

      <section className="home-section home-events-section" aria-labelledby="home-events-title">
        <div className="home-section-heading">
          <h2 id="home-events-title">Sự kiện</h2>
          <p>Những hoạt động đang mở đăng ký tại TinkerBell Garden</p>
        </div>

        {loading && <p className="home-message">Đang tải danh sách sự kiện...</p>}

        {!loading && !message && events.length > 0 && (
          <div className="home-event-grid">
            {events.map((event) => (
              <Link className="home-event-card" to={`/events/${event.id}`} key={event.id}>
                <span>{event.eventType}</span>
                <h3>{event.name}</h3>
                <p>{event.description || 'Nội dung sự kiện đang được cập nhật.'}</p>
                <dl>
                  <div>
                    <dt>Thời gian</dt>
                    <dd>{formatDate(event.startDate)}</dd>
                  </div>
                  <div>
                    <dt>Chi phí tham gia</dt>
                    <dd>{formatCurrency(event.participationFee)}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        )}

        {!loading && !message && events.length === 0 && (
          <p className="home-message">Hiện chưa có sự kiện đang mở đăng ký.</p>
        )}
      </section>

      <section className="home-section home-facilities-section" aria-labelledby="home-facilities-title">
        <div className="home-section-heading">
          <h2 id="home-facilities-title">Các khu vui chơi</h2>
          <p>Click vào từng khu để khám phá</p>
        </div>

        {loading && <p className="home-message">Đang tải danh sách khu vui chơi...</p>}
        {message && <p className="home-message is-error">{message}</p>}

        {!loading && !message && (
          <div className="home-zone-grid">
            {facilities.map((facility, index) => (
              <Link className="home-zone-card" key={facility.id} to={`/facility/${facility.id}`}>
                {facility.imageUrl ? (
                  <span
                    className="home-zone-image-trigger"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setLightboxImage({ src: facility.imageUrl, alt: facility.name })
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        setLightboxImage({ src: facility.imageUrl, alt: facility.name })
                      }
                    }}
                  >
                    <img src={facility.imageUrl} alt={facility.name} />
                  </span>
                ) : (
                  <span className={`home-zone-icon home-zone-${index % 4}`} aria-hidden="true" />
                )}
                <span className="home-zone-status">{statusLabel(facility.status)}</span>
                <h3>{facility.name}</h3>
                <p>{facility.description || 'Thông tin khu vui chơi đang được cập nhật.'}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home-section home-ticket-section" aria-labelledby="home-ticket-title">
        <div>
          <span className="home-eyebrow">Bảng giá</span>
          <h2 id="home-ticket-title">Vé vào cổng</h2>
        </div>

        <div className="home-price-grid">
          {ticketPrices.map((ticket) => (
            <article className="home-price-card" key={ticket.id}>
              <h3>{ticket.type}</h3>
              <strong>{formatCurrency(ticket.price)}</strong>
              <span>{ticket.timeLimit ? `${ticket.timeLimit} phút` : 'Đến giờ đóng cửa'}</span>
            </article>
          ))}
          <button className="home-ticket-placeholder" type="button" onClick={handleBookTicket}>
            Đặt vé
          </button>
        </div>
      </section>
      <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </main>
  )
}
