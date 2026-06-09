import { formatCurrency, formatDate } from '../../../utils/format'

export default function EventsPage({ events, onSelectEvent }) {
  return (
    <section className="section" id="events">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sự kiện</p>
          <h2>Hoạt động đặc biệt</h2>
        </div>
        <span className="section-count">{events.length} sự kiện</span>
      </div>

      <div className="card-grid">
        {events.map((event) => (
          <article className="event-card" key={event.id}>
            <div className="event-card-head">
              <span className="status-pill normal">Early Bird -{event.discountPercent}%</span>
              <strong>{formatCurrency(event.ticketPrice)}</strong>
            </div>
            <h3>{event.name}</h3>
            <p>{event.description}</p>
            <dl className="compact-dl">
              <div>
                <dt>Bắt đầu</dt>
                <dd>{formatDate(event.startDate)}</dd>
              </div>
              <div>
                <dt>Kết thúc</dt>
                <dd>{formatDate(event.endDate)}</dd>
              </div>
            </dl>
            <button className="primary-button full" type="button" onClick={() => onSelectEvent(event)}>
              Đăng ký
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
