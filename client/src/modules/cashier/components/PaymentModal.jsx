import { useState } from 'react'
import { formatCurrency } from '../../../utils/format'
import './PaymentModal.css'

export default function PaymentModal({
  open,
  amount,
  paymentMethod,
  onClose,
  onDone,
}) {
  const [processing, setProcessing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  async function finishPayment() {
    setSubmitting(true)
    try {
      await onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="payment-modal-backdrop" onClick={onClose}>
      <div className="payment-modal" onClick={(event) => event.stopPropagation()}>
        <button className="payment-modal-close" type="button" onClick={onClose} aria-label="Hủy">
          X
        </button>

        <h2>{processing ? 'Đang xử lý...' : `Thanh toán ${paymentMethod}`}</h2>
        <p className="payment-modal-amount">{formatCurrency(amount)}</p>

        {paymentMethod === 'Chuyển khoản' && (
          <img className="payment-modal-qr" src="/myQR.jpg" alt="Mã QR chuyển khoản TinkerBell Garden" />
        )}

        {!processing ? (
          <button className="primary-button full" type="button" onClick={() => setProcessing(true)}>
            Xác nhận
          </button>
        ) : (
          <button className="primary-button full" type="button" onClick={finishPayment} disabled={submitting}>
            Xong
          </button>
        )}
      </div>
    </div>
  )
}
