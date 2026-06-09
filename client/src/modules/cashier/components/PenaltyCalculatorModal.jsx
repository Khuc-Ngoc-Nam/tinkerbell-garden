import { formatCurrency } from '../../../utils/format'

export default function PenaltyCalculatorModal({ calculation, onClose }) {
  if (!calculation) return null

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Phí quá giờ</h3>
        <dl className="bill-lines">
          <div><dt>Số phút vượt</dt><dd>{calculation.overtimeMinutes}</dd></div>
          <div><dt>Block 30 phút</dt><dd>{calculation.overtimeBlocks}</dd></div>
          <div><dt>Phí</dt><dd>{formatCurrency(calculation.overtimePenalty)}</dd></div>
        </dl>
        <button className="primary-button full" type="button" onClick={onClose}>Đóng</button>
      </div>
    </div>
  )
}
