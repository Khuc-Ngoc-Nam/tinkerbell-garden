import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../../../services/api'
import './VipMembership.css'

const vipPackages = [
  { years: 1, label: '1 năm - 400,000', amount: 400000 },
  { years: 2, label: '2 năm - 750,000', amount: 750000 },
  { years: 3, label: '3 năm - 1,000,000', amount: 1000000 },
]

function formatAmountText(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatVipDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `ngày ${day}, tháng ${month}, năm ${date.getFullYear()}`
}

export default function VipMembership() {
  const [profile, setProfile] = useState(null)
  const [selectedYears, setSelectedYears] = useState(1)
  const [step, setStep] = useState('intro')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

  useEffect(() => {
    let active = true

    request('get', '/customers/me', undefined, { authScope: 'customer' })
      .then((data) => {
        if (active) setProfile(data.profile)
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

  const activePackage = useMemo(
    () => vipPackages.find((pack) => pack.years === Number(selectedYears)) || vipPackages[0],
    [selectedYears],
  )
  const isVip = Boolean(profile?.isVip)
  const actionText = isVip ? 'gia hạn' : 'đăng ký'
  const username = profile?.username || profile?.email || profile?.phone || ''

  function confirmPackage(event) {
    event.preventDefault()
    setStep('payment')
  }

  async function submitPayment() {
    setSubmitting(true)
    setMessage('')
    try {
      await request('post', '/portal/vip/payment-request', { years: Number(selectedYears) }, { authScope: 'customer' })
      setPopupOpen(true)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="vip-membership-page">
      <section className="vip-membership-card">
        <Link className="vip-back-link" to="/">Quay lại trang chủ</Link>
        <h1>Thành viên VIP</h1>

        {loading && <p className="vip-message">Đang tải thông tin thành viên...</p>}
        {message && <p className="vip-message is-error">{message}</p>}

        {!loading && !profile && (
          <p className="vip-message">Vui lòng đăng nhập tài khoản khách hàng để sử dụng tính năng thành viên VIP.</p>
        )}

        {!loading && profile && step === 'intro' && (
          <div className="vip-intro">
            {isVip ? (
              <>
                <p>
                  Quý khách đang là thành viên VIP, quý khách có thể nhận được những đặc quyền VIP như giảm giá 20% cho toàn bộ hoạt động tại khu vui chơi. Thời hạn sử dụng đến {formatVipDate(profile.vipExpiryDate)}.
                </p>
                <button className="primary-button" type="button" onClick={() => setStep('choose')}>
                  Gia hạn thành viên VIP
                </button>
              </>
            ) : (
              <>
                <p>
                  Tài khoản của quý khách đang là tài khoản thường. Hãy đăng ký làm thành viên VIP để nhận được các ưu đãi như: "Giảm giá 20% mọi hoạt động ở khu vui chơi" của chúng tôi.
                </p>
                <button className="primary-button" type="button" onClick={() => setStep('choose')}>
                  Đăng ký thành viên VIP
                </button>
              </>
            )}
          </div>
        )}

        {!loading && profile && step === 'choose' && (
          <form className="vip-package-form" onSubmit={confirmPackage}>
            <p>Bạn muốn {actionText} thành viên VIP trong:</p>
            <div className="vip-package-options">
              {vipPackages.map((pack) => (
                <label key={pack.years}>
                  <input
                    type="radio"
                    name="years"
                    value={pack.years}
                    checked={Number(selectedYears) === pack.years}
                    onChange={(event) => setSelectedYears(Number(event.target.value))}
                  />
                  <span>{pack.label}</span>
                </label>
              ))}
            </div>
            <button className="primary-button" type="submit">Đồng ý</button>
          </form>
        )}

        {!loading && profile && step === 'payment' && (
          <div className="vip-payment-box">
            <p>
              Vui lòng chuyển khoản {formatAmountText(activePackage.amount)} cho tài khoản dưới đây.
              Nội dung chuyển khoản: {username} + gói đăng ký.
            </p>
            <img src="/myQR.jpg" alt="Mã QR chuyển khoản TinkerBell Garden" />
            <button className="primary-button" type="button" onClick={submitPayment} disabled={submitting}>
              Đã thanh toán
            </button>
          </div>
        )}
      </section>

      {popupOpen && (
        <div className="vip-popup-backdrop">
          <div className="vip-popup">
            <p>
              Tinkerbell Garden xin chân thành cảm ơn quý khách đã đăng ký gia hạn gói thành viên VIP. Chúng tôi sẽ kiểm tra hóa đơn thanh toán và sẽ gia hạn cho tài khoản của quý khách trong 24 giờ tới. Nếu có vấn đề gì trong quá trình giao dịch, quý khách vui lòng liên hệ tới hotline 0963.417.453 để được nhân viên hỗ trợ. Tinkerbell Garden xin chân thành cảm ơn quý khách!
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setPopupOpen(false)
                setStep('intro')
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
