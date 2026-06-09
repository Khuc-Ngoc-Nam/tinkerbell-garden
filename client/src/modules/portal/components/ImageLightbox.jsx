import './ImageLightbox.css'

export default function ImageLightbox({ image, onClose }) {
  if (!image?.src) return null

  return (
    <div className="image-lightbox-overlay" role="presentation" onClick={onClose}>
      <button className="image-lightbox-close" type="button" onClick={onClose} aria-label="Đóng ảnh phóng to">
        X
      </button>
      <div className="image-lightbox-content" role="dialog" aria-modal="true" aria-label={image.alt || 'Ảnh phóng to'}>
        <img src={image.src} alt={image.alt || ''} onClick={(event) => event.stopPropagation()} />
      </div>
    </div>
  )
}
