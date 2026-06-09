import { Sparkles, TreePine, Castle, Cloud, Star, Leaf, Bird, Rabbit, Flower2, Squirrel, ArrowLeft, Clock, Users, Shield, Calendar, CreditCard, Check, QrCode, CheckCircle, Download, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { request } from '../../../services/api';

const pricingPlans = [
  {
    kind: 'ticket',
    ticketTypeId: 1,
    name: 'Vé 2 giờ',
    price: 150000,
    duration: '120 phút',
    features: [
      'Vào cửa cho một bé trong 2 giờ',
      'Một phụ huynh đi kèm miễn phí',
      'Phụ thu 50.000 VNĐ cho mỗi block 30 phút phát sinh',
    ],
    popular: false,
  },
  {
    kind: 'ticket',
    ticketTypeId: 2,
    name: 'Vé không giới hạn trong ngày',
    price: 250000,
    duration: 'trong ngày',
    features: [
      'Không giới hạn thời gian chơi trong ngày',
      'Một phụ huynh đi kèm miễn phí',
      'Phù hợp cho gia đình muốn ở lại lâu hơn',
    ],
    popular: true,
  },
  {
    kind: 'membership',
    name: 'Thành viên VIP',
    price: 400000,
    duration: 'năm',
    features: [
      'Đăng ký hoặc gia hạn tài khoản thành viên',
      'Giảm 20% vé vào cửa cho một bé mỗi lượt chơi',
      'Theo dõi hạn VIP trên hồ sơ phụ huynh',
    ],
    popular: false,
  },
];

function formatVnd(value: number) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)} VNĐ`;
}

type Facility = {
  id: number;
  name: string;
  description?: string;
  status?: string;
  assetStatus?: string;
  capacity?: number;
  products?: Array<{
    id: number;
    name: string;
    category: string;
    price: number;
    stock: number;
  }>;
};

const facilityVisuals = [
  { icon: TreePine, color: '#81c784' },
  { icon: Sparkles, color: '#E5BA73' },
  { icon: Castle, color: '#a5d6a7' },
  { icon: Cloud, color: '#b8e0d2' },
];

function facilityStatusLabel(status?: string) {
  return {
    Normal: 'Hoạt động',
    Maintenance: 'Bảo trì',
    Broken: 'Hỏng',
  }[status || ''] || status || 'Chưa cập nhật';
}

function facilityAssetStatusLabel(assetStatus?: string) {
  return {
    Ok: 'CSVC OK',
    Issue: 'CSVC cần xử lý',
  }[assetStatus || ''] || assetStatus || 'Chưa cập nhật';
}

export default function TicketSalesPortalFigma({
  authIntent,
  customerSession,
  onAuthIntentHandled,
  onRequireCustomerAuth,
}: any) {
  const [currentView, setCurrentView] = useState<'home' | 'facility' | 'treehouse' | 'sandbox' | 'trampoline' | 'cloud' | 'booking' | 'payment' | 'success'>('home');
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [numberOfChildren, setNumberOfChildren] = useState<number>(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reservationCode, setReservationCode] = useState('');
  const bookingFormRef = useRef<HTMLDivElement | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [facilityLoading, setFacilityLoading] = useState(true);
  const [facilityMessage, setFacilityMessage] = useState('');

  useEffect(() => {
    let active = true;

    request('get', '/portal/info')
      .then((info) => {
        if (!active) return;
        setFacilities(Array.isArray(info.facilities) ? info.facilities : []);
        setFacilityMessage('');
      })
      .catch((error: any) => {
        if (!active) return;
        setFacilityMessage(error.message);
      })
      .finally(() => {
        if (active) setFacilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authIntent?.returnTo !== 'vip-register') return;
    setSelectedPlan(2);
    setCurrentView('booking');
    onAuthIntentHandled?.();
  }, [authIntent, onAuthIntentHandled]);

  async function completePayment() {
    if (selectedPlan === 2) {
      if (!customerSession?.user) {
        onRequireCustomerAuth?.({ returnTo: 'vip-register' });
        return;
      }

      setLoading(true);
      setMessage('');
      try {
        const customer = await request('post', '/portal/vip/register', {}, { authScope: 'customer' });
        setReservationCode(
          customer.vipExpiryDate ? new Date(customer.vipExpiryDate).toLocaleDateString('vi-VN') : 'Đang hoạt động',
        );
      } catch (error: any) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if ((selectedPlan === 0 || selectedPlan === 1) && reservationCode) {
      setLoading(true);
      setMessage('');
      try {
        await request('post', `/portal/tickets/reservations/${encodeURIComponent(reservationCode)}/pay`, {});
      } catch (error: any) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    setCurrentView('success');
  }

  async function completeRegistration() {
    if (selectedPlan === 2 && !customerSession?.user) {
      onRequireCustomerAuth?.({ returnTo: 'vip-register' });
      return;
    }

    if (selectedPlan === 0 || selectedPlan === 1) {
      const form = bookingFormRef.current;
      const fullName = (form?.querySelector('[name="guardianFullName"]') as HTMLInputElement | null)?.value?.trim();
      const phone = (form?.querySelector('[name="guardianPhone"]') as HTMLInputElement | null)?.value?.trim();
      const email = (form?.querySelector('[name="guardianEmail"]') as HTMLInputElement | null)?.value?.trim();
      const visitDate = (form?.querySelector('[name="visitDate"]') as HTMLInputElement | null)?.value;
      const specialRequests = (form?.querySelector('[name="specialRequests"]') as HTMLTextAreaElement | null)?.value || '';
      const children = [...Array(numberOfChildren)].map((_, index) => ({
        fullName: (form?.querySelector(`[name="childName${index}"]`) as HTMLInputElement | null)?.value?.trim() || '',
        birthDate: (form?.querySelector(`[name="childBirthDate${index}"]`) as HTMLInputElement | null)?.value || '',
        age: (form?.querySelector(`[name="childAge${index}"]`) as HTMLInputElement | null)?.value || '',
      }));

      if (!fullName || !phone || !email || !visitDate || children.some((child) => !child.fullName)) {
        setMessage('Vui lòng nhập đầy đủ thông tin phụ huynh, ngày đến và họ tên của từng bé trước khi thanh toán.');
        return;
      }

      setLoading(true);
      setMessage('');
      try {
        const reservation = await request('post', '/portal/tickets/reserve', {
          typeId: pricingPlans[selectedPlan].ticketTypeId,
          fullName,
          email,
          phone,
          children,
          childrenCount: numberOfChildren,
          adultsCount: 1,
          visitDate,
          specialRequests,
        });
        setReservationCode(reservation.qrCode || '');
      } catch (error: any) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    setCurrentView('payment');
  }
  const facilityCards = facilities.map((facility, index) => ({
    ...facility,
    ...facilityVisuals[index % facilityVisuals.length],
  }));

  const selectedPricingPlan = selectedPlan !== null ? pricingPlans[selectedPlan] : null;
  const selectedTotal = selectedPricingPlan
    ? selectedPricingPlan.kind === 'ticket'
      ? selectedPricingPlan.price * numberOfChildren
      : selectedPricingPlan.price
    : 0;

  if (currentView === 'facility' && selectedFacility) {
    const visual = facilityVisuals[facilities.findIndex((facility) => facility.id === selectedFacility.id) % facilityVisuals.length] || facilityVisuals[0];
    const Icon = visual.icon;
    const paidProducts = selectedFacility.products || [];

    return (
      <div className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f1f8f4] via-white to-[#fef9f0] min-h-screen">
          <motion.div className="absolute right-0 top-10 w-1/3 opacity-12" animate={{ y: [0, -20, 0], x: [0, -10, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#E5BA73]" size={500} />
          </motion.div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
            <motion.button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all mb-8"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-[#81c784]" />
              <span className="text-gray-700">Về khu vui chơi</span>
            </motion.button>

            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <Icon className="w-5 h-5" style={{ color: visual.color }} />
                <span className="text-sm text-gray-600">Thông tin khu vui chơi</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">{selectedFacility.name}</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">{selectedFacility.description || 'Chưa có mô tả.'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#81c784] bg-opacity-20 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-[#81c784]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Sức chứa</h3>
                <p className="text-gray-600">{selectedFacility.capacity ?? 0} khách</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#E5BA73] bg-opacity-20 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-[#E5BA73]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Trạng thái</h3>
                <p className="text-gray-600">{facilityStatusLabel(selectedFacility.status)}</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#a5d6a7] bg-opacity-20 flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7 text-[#a5d6a7]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">CSVC</h3>
                <p className="text-gray-600">{facilityAssetStatusLabel(selectedFacility.assetStatus)}</p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Sản phẩm tính phí thêm</h2>
              {paidProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paidProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">{product.name}</h3>
                        <p className="text-gray-600">{product.category} · Còn {product.stock}</p>
                      </div>
                      <strong className="text-gray-800 whitespace-nowrap">{formatVnd(product.price)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Khu này hiện chưa có sản phẩm tính phí thêm.</p>
              )}
            </div>

            <div className="text-center">
              <motion.button
                onClick={() => setCurrentView('booking')}
                className="px-8 py-4 bg-gradient-to-r from-[#81c784] to-[#a5d6a7] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="flex items-center gap-2">Đặt vé ngay<Sparkles className="w-5 h-5" /></span>
              </motion.button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (currentView === 'treehouse') {
    return (
      <div className="min-h-screen bg-white">
        {/* Treehouse Detail Page */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f1f8f4] via-white to-[#fef9f0] min-h-screen">
          {/* Same Magical Background */}
          <div className="absolute left-0 bottom-0 w-1/3 h-full opacity-15">
            <motion.div
              className="absolute bottom-0 left-0"
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              <TreePine className="text-[#81c784]" size={400} style={{ transform: 'translateY(50px)' }} />
            </motion.div>
            <motion.div
              className="absolute bottom-0 left-32"
              animate={{ x: [0, -8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <TreePine className="text-[#a5d6a7]" size={350} style={{ transform: 'translateY(30px)' }} />
            </motion.div>
          </div>

          <motion.div
            className="absolute right-0 top-10 w-1/3 opacity-12"
            animate={{ y: [0, -20, 0], x: [0, -10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            <Castle className="text-[#E5BA73]" size={500} />
          </motion.div>

          {/* Floating Elements */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -40, 0], opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3, ease: "easeInOut" }}
            >
              <Star className="text-[#E5BA73]" size={8 + Math.random() * 12} fill="#E5BA73" />
            </motion.div>
          ))}

          <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20">
            <div className="flex justify-around items-end h-full">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={`ground-flower-${i}`}
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                >
                  <Flower2 className="text-[#E5BA73]" size={40 + (i % 3) * 10} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
            {/* Back Button */}
            <motion.button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all mb-8"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-[#81c784]" />
              <span className="text-gray-700">Về khu vui chơi</span>
            </motion.button>

            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <TreePine className="w-5 h-5 text-[#81c784]" />
                <span className="text-sm text-gray-600">Featured Play Zone</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">
                Magic Treehouse
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Climb through enchanted branches and discover hidden fairy doors in our magical treehouse adventure
              </p>
            </div>

            {/* Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <motion.div
                className="md:col-span-2 rounded-3xl overflow-hidden shadow-xl"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1633815096208-c0af2ed44b0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                  alt="Magic Treehouse"
                  className="w-full h-96 object-cover"
                />
              </motion.div>
              <div className="grid grid-rows-2 gap-6">
                <motion.div
                  className="rounded-3xl overflow-hidden shadow-xl"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1519226135464-df5a9dbcd2a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                    alt="Children playing"
                    className="w-full h-44 object-cover"
                  />
                </motion.div>
                <motion.div
                  className="rounded-3xl overflow-hidden shadow-xl"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1549733428-d1e1bee7ef9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                    alt="Treehouse structure"
                    className="w-full h-44 object-cover"
                  />
                </motion.div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#81c784] bg-opacity-20 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-[#81c784]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ages 3-12</h3>
                <p className="text-gray-600">
                  Designed for children of all ages with different difficulty levels
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#E5BA73] bg-opacity-20 flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7 text-[#E5BA73]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Safe & Secure</h3>
                <p className="text-gray-600">
                  Padded floors, safety nets, and supervised by trained staff
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#a5d6a7] bg-opacity-20 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-[#a5d6a7]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Open All Day</h3>
                <p className="text-gray-600">
                  Available during all park hours with no time limit
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">About the Magic Treehouse</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Step into our enchanted treehouse where imagination comes alive! This multi-level wooden wonderland features winding pathways, rope bridges, and secret hideaways nestled among the branches.
                </p>
                <p>
                  Children can explore fairy doors that reveal magical surprises, climb through tunnel slides, and discover hidden nooks perfect for reading or quiet play. The treehouse is designed with multiple entry and exit points, allowing kids to create their own adventure paths.
                </p>
                <p>
                  Our treehouse combines classic outdoor play with whimsical fairy-tale elements, featuring hand-painted murals of woodland creatures, twinkling lights, and soft background music that creates an immersive magical forest atmosphere.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <motion.button
                onClick={() => setCurrentView('booking')}
                className="px-8 py-4 bg-gradient-to-r from-[#81c784] to-[#a5d6a7] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="flex items-center gap-2">
                  Đặt vé ngay
                  <Sparkles className="w-5 h-5" />
                </span>
              </motion.button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (currentView === 'sandbox') {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#fef9f0] via-white to-[#f1f8f4] min-h-screen">
          {/* Magical Background */}
          <div className="absolute left-0 bottom-0 w-1/3 h-full opacity-15">
            <motion.div className="absolute bottom-0 left-0" animate={{ x: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
              <TreePine className="text-[#81c784]" size={400} style={{ transform: 'translateY(50px)' }} />
            </motion.div>
            <motion.div className="absolute bottom-0 left-32" animate={{ x: [0, -8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
              <TreePine className="text-[#a5d6a7]" size={350} style={{ transform: 'translateY(30px)' }} />
            </motion.div>
          </div>

          <motion.div className="absolute right-0 top-10 w-1/3 opacity-12" animate={{ y: [0, -20, 0], x: [0, -10, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#E5BA73]" size={500} />
          </motion.div>

          {[...Array(30)].map((_, i) => (
            <motion.div key={`sparkle-${i}`} className="absolute" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -40, 0], opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3, ease: "easeInOut" }}>
              <Star className="text-[#E5BA73]" size={8 + Math.random() * 12} fill="#E5BA73" />
            </motion.div>
          ))}

          <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20">
            <div className="flex justify-around items-end h-full">
              {[...Array(20)].map((_, i) => (
                <motion.div key={`ground-flower-${i}`} animate={{ scale: [1, 1.3, 1], rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}>
                  <Flower2 className="text-[#E5BA73]" size={40 + (i % 3) * 10} />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
            <motion.button onClick={() => setCurrentView('home')} className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all mb-8"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5 text-[#E5BA73]" />
              <span className="text-gray-700">Về khu vui chơi</span>
            </motion.button>

            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <Sparkles className="w-5 h-5 text-[#E5BA73]" />
                <span className="text-sm text-gray-600">Featured Play Zone</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">Pixie Dust Sandbox</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Build sandcastles in our magical golden sand pit sprinkled with enchantment</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <motion.div className="md:col-span-2 rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
                <img src="https://images.unsplash.com/photo-1529651490292-99f6f9ade9e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Pixie Dust Sandbox" className="w-full h-96 object-cover" />
              </motion.div>
              <div className="grid grid-rows-2 gap-6">
                <motion.div className="rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
                  <img src="https://images.unsplash.com/photo-1582455462467-b2bf6e3e211f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Children playing in sand" className="w-full h-44 object-cover" />
                </motion.div>
                <motion.div className="rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
                  <img src="https://images.unsplash.com/photo-1774624345037-c772dfe7bdae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Sand play" className="w-full h-44 object-cover" />
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#E5BA73] bg-opacity-20 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-[#E5BA73]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ages 2-10</h3>
                <p className="text-gray-600">Perfect for toddlers and young children to explore sensory play</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#E5BA73] bg-opacity-20 flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7 text-[#E5BA73]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Clean & Safe</h3>
                <p className="text-gray-600">Sanitized daily with child-safe, non-toxic golden sand</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#E5BA73] bg-opacity-20 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-[#E5BA73]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Free Toys</h3>
                <p className="text-gray-600">Buckets, shovels, molds, and fairy-themed toys included</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">About the Pixie Dust Sandbox</h2>
              <div className="space-y-4 text-gray-600">
                <p>Our enchanted sandbox features special golden-tinted sand that sparkles in the light, creating a truly magical play experience. The large, covered sandbox area protects children from the sun while they dig, build, and create.</p>
                <p>Kids can use our collection of castle molds, fairy figurines, and garden-themed tools to construct their own magical kingdoms. The sandbox includes hidden treasures that children can discover as they dig, adding an element of adventure to their play.</p>
                <p>With comfortable seating areas around the perimeter, parents can relax while keeping an eye on their little builders. The sand is specially treated to stay soft and moldable, making it perfect for detailed creations.</p>
              </div>
            </div>

            <div className="text-center">
              <motion.button
                onClick={() => setCurrentView('booking')}
                className="px-8 py-4 bg-gradient-to-r from-[#E5BA73] to-[#d4a862] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <span className="flex items-center gap-2">Đặt vé ngay<Sparkles className="w-5 h-5" /></span>
              </motion.button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (currentView === 'trampoline') {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f1f8f4] via-white to-[#fef9f0] min-h-screen">
          {/* Magical Background */}
          <div className="absolute left-0 bottom-0 w-1/3 h-full opacity-15">
            <motion.div className="absolute bottom-0 left-0" animate={{ x: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
              <TreePine className="text-[#81c784]" size={400} style={{ transform: 'translateY(50px)' }} />
            </motion.div>
          </div>

          <motion.div className="absolute right-0 top-10 w-1/3 opacity-12" animate={{ y: [0, -20, 0], x: [0, -10, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#a5d6a7]" size={500} />
          </motion.div>

          {[...Array(30)].map((_, i) => (
            <motion.div key={`sparkle-${i}`} className="absolute" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -40, 0], opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3, ease: "easeInOut" }}>
              <Star className="text-[#a5d6a7]" size={8 + Math.random() * 12} fill="#a5d6a7" />
            </motion.div>
          ))}

          <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20">
            <div className="flex justify-around items-end h-full">
              {[...Array(20)].map((_, i) => (
                <motion.div key={`ground-flower-${i}`} animate={{ scale: [1, 1.3, 1], rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}>
                  <Flower2 className="text-[#a5d6a7]" size={40 + (i % 3) * 10} />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
            <motion.button onClick={() => setCurrentView('home')} className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all mb-8"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5 text-[#a5d6a7]" />
              <span className="text-gray-700">Về khu vui chơi</span>
            </motion.button>

            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <Castle className="w-5 h-5 text-[#a5d6a7]" />
                <span className="text-sm text-gray-600">Featured Play Zone</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">Trampoline Kingdom</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Bounce among the clouds in our safe, magical jumping zone</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <motion.div className="md:col-span-2 rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
                <img src="https://images.unsplash.com/photo-1751235640841-d8d1035a80f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Trampoline Kingdom" className="w-full h-96 object-cover" />
              </motion.div>
              <div className="grid grid-rows-2 gap-6">
                <motion.div className="rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
                  <img src="https://images.unsplash.com/photo-1751235604534-f07bf076d690?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Trampolines" className="w-full h-44 object-cover" />
                </motion.div>
                <motion.div className="rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
                  <img src="https://images.unsplash.com/photo-1751235600651-94bbbeb29567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Foam pit" className="w-full h-44 object-cover" />
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#a5d6a7] bg-opacity-20 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-[#a5d6a7]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ages 4+</h3>
                <p className="text-gray-600">Dedicated zones for different age groups and skill levels</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#a5d6a7] bg-opacity-20 flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7 text-[#a5d6a7]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Safety First</h3>
                <p className="text-gray-600">Padded walls, foam pit, and supervised by certified staff</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#a5d6a7] bg-opacity-20 flex items-center justify-center mb-4">
                  <Cloud className="w-7 h-7 text-[#a5d6a7]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Cloud Theme</h3>
                <p className="text-gray-600">Decorated with clouds and stars for a magical atmosphere</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">About the Trampoline Kingdom</h2>
              <div className="space-y-4 text-gray-600">
                <p>Welcome to our Trampoline Kingdom, where children can bounce their way through the clouds! Our state-of-the-art trampoline park features interconnected trampolines, foam pits, and cushioned landing zones for maximum safety and fun.</p>
                <p>The kingdom includes different zones: a freestyle jumping area, dodgeball courts, basketball slam dunk lanes, and a special toddler section with smaller trampolines. Cloud-themed decorations and gentle lighting create an ethereal bouncing experience.</p>
                <p>Our trained staff monitor all activities and enforce safety rules to ensure every child has a blast while staying protected. Anti-slip socks are required and available for purchase at the entrance.</p>
              </div>
            </div>

            <div className="text-center">
              <motion.button
                onClick={() => setCurrentView('booking')}
                className="px-8 py-4 bg-gradient-to-r from-[#a5d6a7] to-[#81c784] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <span className="flex items-center gap-2">Đặt vé ngay<Sparkles className="w-5 h-5" /></span>
              </motion.button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (currentView === 'cloud') {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f8fbff] via-white to-[#f1f8f4] min-h-screen">
          {/* Magical Background */}
          <div className="absolute left-0 bottom-0 w-1/3 h-full opacity-15">
            <motion.div className="absolute bottom-0 left-0" animate={{ x: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
              <TreePine className="text-[#81c784]" size={400} style={{ transform: 'translateY(50px)' }} />
            </motion.div>
          </div>

          <motion.div className="absolute right-0 top-10 w-1/3 opacity-12" animate={{ y: [0, -20, 0], x: [0, -10, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#b8e0d2]" size={500} />
          </motion.div>

          {[...Array(30)].map((_, i) => (
            <motion.div key={`sparkle-${i}`} className="absolute" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -40, 0], opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3, ease: "easeInOut" }}>
              <Cloud className="text-[#b8e0d2]" size={8 + Math.random() * 12} />
            </motion.div>
          ))}

          <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20">
            <div className="flex justify-around items-end h-full">
              {[...Array(20)].map((_, i) => (
                <motion.div key={`ground-flower-${i}`} animate={{ scale: [1, 1.3, 1], rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}>
                  <Flower2 className="text-[#b8e0d2]" size={40 + (i % 3) * 10} />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
            <motion.button onClick={() => setCurrentView('home')} className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all mb-8"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5 text-[#b8e0d2]" />
              <span className="text-gray-700">Về khu vui chơi</span>
            </motion.button>

            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <Cloud className="w-5 h-5 text-[#b8e0d2]" />
                <span className="text-sm text-gray-600">Featured Play Zone</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">Cloud Garden</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Float through soft play areas designed for little dreamers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <motion.div className="md:col-span-2 rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
                <img src="https://images.unsplash.com/photo-1759330203240-b89ccee8840f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Cloud Garden" className="w-full h-96 object-cover" />
              </motion.div>
              <div className="grid grid-rows-2 gap-6">
                <motion.div className="rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
                  <img src="https://images.unsplash.com/photo-1774885370242-1c9c77093513?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Climbing wall" className="w-full h-44 object-cover" />
                </motion.div>
                <motion.div className="rounded-3xl overflow-hidden shadow-xl" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
                  <img src="https://images.unsplash.com/photo-1768054193070-ec10b5583bc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" alt="Ball pit" className="w-full h-44 object-cover" />
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#b8e0d2] bg-opacity-20 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-[#b8e0d2]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ages 1-6</h3>
                <p className="text-gray-600">Perfect for toddlers and preschoolers in a safe environment</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#b8e0d2] bg-opacity-20 flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7 text-[#b8e0d2]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Soft & Gentle</h3>
                <p className="text-gray-600">Padded surfaces, soft foam shapes, and cushioned floors</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#b8e0d2] bg-opacity-20 flex items-center justify-center mb-4">
                  <Cloud className="w-7 h-7 text-[#b8e0d2]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Dreamy Design</h3>
                <p className="text-gray-600">Cloud-shaped cushions and calming pastel colors</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">About the Cloud Garden</h2>
              <div className="space-y-4 text-gray-600">
                <p>The Cloud Garden is our gentle soft play area designed specifically for our youngest visitors. With plush cloud-shaped cushions, pastel colors, and soft lighting, it creates a calm and dreamy environment where little ones can explore safely.</p>
                <p>Features include a ball pit filled with pastel balls, soft foam building blocks, mini slides with gentle slopes, climbing structures with padded surfaces, and cozy reading nooks. The entire area is enclosed and temperature-controlled for comfort.</p>
                <p>Parents can relax in designated seating areas while maintaining clear sight lines to their children. The Cloud Garden also includes a quiet corner for nursing mothers and a clean diaper changing station.</p>
              </div>
            </div>

            <div className="text-center">
              <motion.button
                onClick={() => setCurrentView('booking')}
                className="px-8 py-4 bg-gradient-to-r from-[#b8e0d2] to-[#a5d6a7] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <span className="flex items-center gap-2">Đặt vé ngay<Sparkles className="w-5 h-5" /></span>
              </motion.button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (currentView === 'booking') {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f1f8f4] via-white to-[#fef9f0] min-h-screen">
          {/* Magical Background */}
          <motion.div className="absolute left-0 top-0 w-1/3 opacity-12" animate={{ y: [0, -25, 0], x: [0, 15, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#E5BA73]" size={450} />
          </motion.div>

          <motion.div className="absolute right-0 bottom-0 w-1/3 opacity-12" animate={{ y: [0, -20, 0], x: [0, -12, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#a5d6a7]" size={400} />
          </motion.div>

          <motion.div className="absolute top-1/4 left-1/3 w-[600px] h-40 bg-white rounded-full opacity-50 blur-3xl" animate={{ x: [0, 150, 0], scale: [1, 1.3, 1] }} transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} />

          <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20">
            <motion.div className="absolute bottom-10 left-1/4" animate={{ x: [0, 60, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
              <Rabbit className="text-[#81c784]" size={90} />
            </motion.div>
            <motion.div className="absolute bottom-12 right-1/4" animate={{ x: [0, -50, 0], rotate: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <Squirrel className="text-[#a5d6a7]" size={85} />
            </motion.div>
          </div>

          {[...Array(40)].map((_, i) => (
            <motion.div key={`pricing-sparkle-${i}`} className="absolute" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -50, 0], rotate: [0, 360], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
              transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3, ease: "easeInOut" }}>
              <Sparkles className="text-[#E5BA73]" size={10 + Math.random() * 15} />
            </motion.div>
          ))}

          {/* Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
            <motion.button onClick={() => setCurrentView('home')} className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all mb-8"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5 text-[#81c784]" />
              <span className="text-gray-700">Về khu vui chơi</span>
            </motion.button>

            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <Calendar className="w-5 h-5 text-[#E5BA73]" />
                <span className="text-sm text-gray-600">Đặt vé và đăng ký thành viên</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">Chọn gói phù hợp</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Giá vé và quyền lợi được đồng bộ theo hệ thống TinkerBell Garden</p>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={index}
                  onClick={() => setSelectedPlan(index)}
                  className={`relative bg-white/90 backdrop-blur-sm rounded-3xl p-8 border-2 transition-all duration-300 cursor-pointer ${
                    plan.popular
                      ? 'border-[#E5BA73] shadow-xl scale-105'
                      : selectedPlan === index
                      ? 'border-[#81c784] shadow-xl scale-105'
                      : 'border-gray-100 shadow-sm hover:shadow-lg hover:scale-102'
                  }`}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-gradient-to-r from-[#E5BA73] to-[#d4a862] text-white px-4 py-1 rounded-full text-sm font-medium shadow-md">
                        Phổ biến
                      </div>
                    </div>
                  )}

                  {selectedPlan === index && (
                    <div className="absolute -top-3 -right-3">
                      <div className="w-10 h-10 rounded-full bg-[#81c784] flex items-center justify-center shadow-lg">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl md:text-5xl font-bold text-gray-800">{formatVnd(plan.price)}</span>
                      <span className="text-gray-500">/{plan.duration}</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#81c784] bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-[#81c784]"></div>
                        </div>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-3 rounded-xl font-medium transition-all duration-300 ${
                      selectedPlan === index
                        ? 'bg-gradient-to-r from-[#81c784] to-[#a5d6a7] text-white shadow-md'
                        : plan.popular
                        ? 'bg-gradient-to-r from-[#E5BA73] to-[#d4a862] text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {selectedPlan === index ? 'Đã chọn' : plan.kind === 'membership' ? 'Đăng ký VIP' : 'Chọn vé'}
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Booking Form */}
            {selectedPlan !== null && (
              <motion.div
                ref={bookingFormRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl mb-8"
              >
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                  {selectedPricingPlan?.kind === 'membership' ? 'Đăng ký thành viên VIP' : 'Hoàn tất thông tin đặt vé'}
                </h2>

                {selectedPricingPlan?.kind === 'membership' ? (
                  <>
                    <div className="bg-gradient-to-br from-[#f1f8f4] to-[#fef9f0] rounded-2xl p-6 mb-6 border-2 border-[#81c784]/20">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-[#81c784]" />
                        Tài khoản thành viên
                      </h3>
                      {customerSession?.user ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                          <div className="bg-white rounded-xl p-4 border border-[#81c784]/20">
                            <span className="block text-sm text-gray-500 mb-1">Phụ huynh</span>
                            <strong>{customerSession.user.fullName}</strong>
                          </div>
                          <div className="bg-white rounded-xl p-4 border border-[#81c784]/20">
                            <span className="block text-sm text-gray-500 mb-1">Email</span>
                            <strong>{customerSession.user.email || 'Chưa cập nhật'}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl p-5 border border-[#E5BA73]/30">
                          <p className="text-gray-700 mb-4">
                            Thành viên VIP được gắn với tài khoản phụ huynh. Vui lòng đăng nhập hoặc tạo tài khoản trước khi đăng ký.
                          </p>
                          <button
                            type="button"
                            onClick={() => onRequireCustomerAuth?.({ returnTo: 'vip-register' })}
                            className="px-5 py-3 bg-gradient-to-r from-[#81c784] to-[#a5d6a7] text-white rounded-xl shadow-md"
                          >
                            Đăng nhập để đăng ký VIP
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-gradient-to-br from-[#f1f8f4] to-[#fef9f0] rounded-2xl p-6 mb-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#E5BA73]" />
                        Tóm tắt thành viên
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-gray-700">
                          <span>Gói:</span>
                          <span className="font-semibold">{selectedPricingPlan.name}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Hiệu lực:</span>
                          <span className="font-semibold">12 tháng từ ngày kích hoạt</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Quyền lợi:</span>
                          <span className="font-semibold text-right">Giảm 20% vé vào cửa cho một bé mỗi lượt chơi</span>
                        </div>
                        <div className="border-t border-gray-300 pt-3 flex justify-between">
                          <span className="text-lg font-bold text-gray-800">Phí thành viên:</span>
                          <span className="text-2xl font-bold text-[#81c784]">{formatVnd(selectedTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                {/* Parent/Guardian Information */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#81c784]" />
                    Thông tin phụ huynh
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-2">Họ tên phụ huynh *</label>
                      <input
                        name="guardianFullName"
                        type="text"
                        placeholder="Nhập họ tên phụ huynh"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Số điện thoại *</label>
                      <input
                        name="guardianPhone"
                        type="tel"
                        placeholder="0901234567"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Email *</label>
                      <input
                        name="guardianEmail"
                        type="email"
                        placeholder="email@example.com"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Number of Children Selection */}
                <div className="mb-8">
                  <label className="block text-gray-700 mb-2">Số bé *</label>
                  <select
                    value={numberOfChildren}
                    onChange={(e) => setNumberOfChildren(parseInt(e.target.value))}
                    className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                  >
                    <option value={1}>1 bé</option>
                    <option value={2}>2 bé</option>
                    <option value={3}>3 bé</option>
                    <option value={4}>4 bé</option>
                    <option value={5}>5 bé</option>
                  </select>
                </div>

                {/* Children Information */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#E5BA73]" />
                    Thông tin của bé
                  </h3>

                  <div className="space-y-6">
                    {[...Array(numberOfChildren)].map((_, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gradient-to-br from-[#f1f8f4] to-[#fef9f0] rounded-2xl p-6 border-2 border-[#81c784]/20"
                      >
                        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#81c784] text-white flex items-center justify-center text-sm">
                            {index + 1}
                          </div>
                          Bé {index + 1}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-gray-700 mb-2">Họ tên bé *</label>
                            <input
                              name={`childName${index}`}
                              type="text"
                              placeholder="Nhập họ tên bé"
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-700 mb-2">Ngày sinh</label>
                            <input
                              name={`childBirthDate${index}`}
                              type="date"
                              required
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-700 mb-2">Tuổi</label>
                            <input
                              name={`childAge${index}`}
                              type="number"
                              placeholder="Tuổi"
                              min="1"
                              max="18"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Visit Date */}
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">Ngày đến *</label>
                  <input
                    name="visitDate"
                    type="date"
                    required
                    className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                  />
                </div>

                {/* Special Requests */}
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">Ghi chú thêm</label>
                  <textarea
                    name="specialRequests"
                    placeholder="Ví dụ: sinh nhật, yêu cầu hỗ trợ, thông tin cần lưu ý..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#81c784] focus:outline-none focus:ring-2 focus:ring-[#81c784]/20 transition-all"
                  ></textarea>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-br from-[#f1f8f4] to-[#fef9f0] rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#E5BA73]" />
                    Tóm tắt đặt vé
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-700">
                      <span>Gói vé:</span>
                      <span className="font-semibold">{pricingPlans[selectedPlan].name}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Số bé:</span>
                      <span className="font-semibold">{numberOfChildren} bé</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Đơn giá:</span>
                      <span className="font-semibold">{formatVnd(pricingPlans[selectedPlan].price)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-3 flex justify-between">
                      <span className="text-lg font-bold text-gray-800">Tổng tiền:</span>
                      <span className="text-2xl font-bold text-[#81c784]">{formatVnd(selectedTotal)}</span>
                    </div>
                  </div>
                </div>
                  </>
                )}

                {message && (
                  <p className="text-center text-sm text-red-600 mb-4">{message}</p>
                )}

                {/* Complete Registration Button */}
                <motion.button
                  onClick={completeRegistration}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-[#81c784] to-[#a5d6a7] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>
                    {loading
                      ? 'Đang xử lý...'
                      : selectedPricingPlan?.kind === 'membership' && !customerSession?.user
                        ? 'Đăng nhập để đăng ký VIP'
                        : selectedPricingPlan?.kind === 'membership'
                          ? 'Tiếp tục thanh toán VIP'
                          : 'Tiếp tục thanh toán vé'}
                  </span>
                  <Sparkles className="w-5 h-5" />
                </motion.button>

                <p className="text-center text-sm text-gray-500 mt-4">
                  <Shield className="w-4 h-4 inline-block mr-1" />
                  Thông tin đặt vé và tài khoản được bảo vệ trong hệ thống.
                </p>
              </motion.div>
            )}

            {selectedPlan === null && (
              <div className="text-center py-12">
                <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Chọn gói vé hoặc thành viên để tiếp tục</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (currentView === 'payment') {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f1f8f4] via-white to-[#fef9f0] min-h-screen">
          {/* Magical Background */}
          <motion.div className="absolute left-0 top-0 w-1/3 opacity-12" animate={{ y: [0, -25, 0], x: [0, 15, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#E5BA73]" size={450} />
          </motion.div>

          <motion.div className="absolute right-0 bottom-0 w-1/3 opacity-12" animate={{ y: [0, -20, 0], x: [0, -12, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#a5d6a7]" size={400} />
          </motion.div>

          {[...Array(40)].map((_, i) => (
            <motion.div key={`sparkle-${i}`} className="absolute" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -50, 0], rotate: [0, 360], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
              transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3, ease: "easeInOut" }}>
              <Sparkles className="text-[#E5BA73]" size={10 + Math.random() * 15} />
            </motion.div>
          ))}

          <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20">
            <motion.div className="absolute bottom-10 left-1/4" animate={{ x: [0, 60, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
              <Rabbit className="text-[#81c784]" size={90} />
            </motion.div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
            <motion.button onClick={() => setCurrentView('booking')} className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all mb-8"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5 text-[#81c784]" />
              <span className="text-gray-700">Quay lại</span>
            </motion.button>

            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <QrCode className="w-5 h-5 text-[#E5BA73]" />
                <span className="text-sm text-gray-600">Thanh toán</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">Quét mã thanh toán</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {selectedPricingPlan?.kind === 'membership'
                  ? 'Hoàn tất phí thành viên VIP để kích hoạt quyền lợi trên tài khoản'
                  : 'Hoàn tất thanh toán để xác nhận mã đặt vé'}
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl mb-8">
              {/* Payment Summary */}
              <div className="bg-gradient-to-br from-[#f1f8f4] to-[#fef9f0] rounded-2xl p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Chi tiết thanh toán</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Gói:</span>
                    <span className="font-semibold">{selectedPlan !== null ? pricingPlans[selectedPlan].name : ''}</span>
                  </div>
                  {selectedPricingPlan?.kind === 'ticket' ? (
                    <div className="flex justify-between text-gray-700">
                      <span>Số bé:</span>
                      <span className="font-semibold">{numberOfChildren} bé</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-gray-700">
                      <span>Tài khoản:</span>
                      <span className="font-semibold text-right">{customerSession?.user?.fullName || 'Phụ huynh'}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-3 flex justify-between">
                    <span className="text-2xl font-bold text-gray-800">Tổng tiền:</span>
                    <span className="text-3xl font-bold text-[#81c784]">{formatVnd(selectedTotal)}</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-block bg-white p-8 rounded-3xl shadow-2xl"
                >
                  <div className="w-64 h-64 bg-gradient-to-br from-[#81c784] to-[#a5d6a7] rounded-2xl flex items-center justify-center mb-4">
                    <QrCode className="w-48 h-48 text-white" strokeWidth={1.5} />
                  </div>
                  <p className="text-gray-600 font-medium">Quét mã bằng ứng dụng ngân hàng hoặc ví điện tử</p>
                </motion.div>
              </div>

              {/* Payment Instructions */}
              <div className="bg-white rounded-2xl p-6 mb-6 border-2 border-[#81c784]/20">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#81c784]" />
                  Hướng dẫn thanh toán
                </h4>
                <ol className="space-y-2 text-gray-600 list-decimal list-inside">
                  <li>Mở ứng dụng ngân hàng hoặc ví điện tử hỗ trợ QR</li>
                  <li>Quét mã thanh toán hiển thị phía trên</li>
                  <li>Kiểm tra đúng số tiền {formatVnd(selectedTotal)}</li>
                  <li>Bấm xác nhận sau khi giao dịch hoàn tất</li>
                </ol>
              </div>

              {/* Alternative Payment Methods */}
              <div className="text-center text-sm text-gray-500 mb-6">
                <p>Hỗ trợ thanh toán QR qua ứng dụng ngân hàng và ví điện tử phổ biến tại Việt Nam</p>
              </div>

              {message && (
                <p className="text-center text-sm text-red-600 mb-4">{message}</p>
              )}

              {/* Simulate Payment Success Button */}
              <motion.button
                onClick={completePayment}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#81c784] to-[#a5d6a7] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle className="w-5 h-5" />
                <span>{loading ? 'Đang xử lý...' : 'Tôi đã hoàn tất thanh toán'}</span>
              </motion.button>

              <p className="text-center text-xs text-gray-500 mt-4">
                Chỉ xác nhận sau khi giao dịch đã thành công
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (currentView === 'success') {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f1f8f4] via-white to-[#fef9f0] min-h-screen flex items-center justify-center">
          {/* Magical Background */}
          <motion.div className="absolute left-0 top-0 w-1/3 opacity-12" animate={{ y: [0, -25, 0], x: [0, 15, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#E5BA73]" size={450} />
          </motion.div>

          <motion.div className="absolute right-0 bottom-0 w-1/3 opacity-12" animate={{ y: [0, -20, 0], x: [0, -12, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>
            <Castle className="text-[#a5d6a7]" size={400} />
          </motion.div>

          {/* Celebration Sparkles */}
          {[...Array(60)].map((_, i) => (
            <motion.div key={`sparkle-${i}`} className="absolute" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -100, 0], rotate: [0, 360], opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2, ease: "easeInOut" }}>
              <Sparkles className="text-[#E5BA73]" size={10 + Math.random() * 20} />
            </motion.div>
          ))}

          {/* Content */}
          <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="mb-8"
            >
              <div className="inline-block bg-gradient-to-br from-[#81c784] to-[#a5d6a7] rounded-full p-6 shadow-2xl mb-6">
                <CheckCircle className="w-24 h-24 text-white" strokeWidth={2} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">
                Thanh toán thành công!
              </h1>
              <p className="text-2xl text-gray-600 mb-8">
                {selectedPricingPlan?.kind === 'membership'
                  ? 'Tài khoản VIP đã được cập nhật.'
                  : 'Mã đặt vé của bạn đã được xác nhận.'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl mb-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                <Calendar className="w-6 h-6 text-[#E5BA73]" />
                {selectedPricingPlan?.kind === 'membership' ? 'Xác nhận thành viên' : 'Xác nhận đặt vé'}
              </h2>

              <div className="bg-gradient-to-br from-[#f1f8f4] to-[#fef9f0] rounded-2xl p-6 mb-6">
                <div className="space-y-4 text-left">
                  <div className="flex justify-between border-b border-gray-200 pb-3">
                    <span className="text-gray-600">{selectedPricingPlan?.kind === 'membership' ? 'Hạn VIP:' : 'Mã đặt vé:'}</span>
                    <span className="font-bold text-gray-800">{reservationCode || `#TG-2024-${Math.floor(Math.random() * 10000)}`}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-3">
                    <span className="text-gray-600">Gói:</span>
                    <span className="font-semibold text-gray-800">{selectedPlan !== null ? pricingPlans[selectedPlan].name : ''}</span>
                  </div>
                  {selectedPricingPlan?.kind === 'ticket' ? (
                    <div className="flex justify-between border-b border-gray-200 pb-3">
                      <span className="text-gray-600">Số bé:</span>
                      <span className="font-semibold text-gray-800">{numberOfChildren} bé</span>
                    </div>
                  ) : (
                    <div className="flex justify-between border-b border-gray-200 pb-3">
                      <span className="text-gray-600">Tài khoản:</span>
                      <span className="font-semibold text-gray-800">{customerSession?.user?.fullName || 'Phụ huynh'}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-gray-200 pb-3">
                    <span className="text-gray-600">Số tiền đã thanh toán:</span>
                    <span className="font-bold text-[#81c784] text-xl">{formatVnd(selectedTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái:</span>
                    <span className="font-semibold text-[#81c784] flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Đã xác nhận
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#E5BA73]/10 rounded-2xl p-4 mb-6">
                <p className="text-sm text-gray-700 flex items-start gap-2">
                  <Mail className="w-5 h-5 text-[#E5BA73] flex-shrink-0 mt-0.5" />
                  <span>
                    {selectedPricingPlan?.kind === 'membership'
                      ? 'Thông tin thành viên VIP đã được lưu trên tài khoản phụ huynh.'
                      : 'Mã đặt vé và thông tin thanh toán đã được lưu trong hệ thống để nhân viên đối soát khi đến khu vui chơi.'}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.button
                  onClick={() => setCurrentView('home')}
                  className="py-3 px-6 bg-white border-2 border-[#81c784] text-[#81c784] rounded-xl font-medium hover:bg-[#81c784] hover:text-white transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Về trang chủ
                </motion.button>

                <motion.button
                  className="py-3 px-6 bg-gradient-to-r from-[#81c784] to-[#a5d6a7] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download className="w-5 h-5" />
                  {selectedPricingPlan?.kind === 'membership' ? 'Lưu xác nhận' : 'Tải vé'}
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center gap-2 text-gray-600"
            >
              <Sparkles className="w-5 h-5 text-[#E5BA73]" />
              <p>Hẹn gặp bạn tại Tinkerbell Garden!</p>
              <Sparkles className="w-5 h-5 text-[#E5BA73]" />
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f1f8f4] via-white to-[#fef9f0] px-6 py-20 md:py-32">
        {/* Large Background Forest Left Side */}
        <div className="absolute left-0 bottom-0 w-1/3 h-full opacity-15">
          <motion.div
            className="absolute bottom-0 left-0"
            animate={{
              x: [0, 10, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <TreePine className="text-[#81c784]" size={400} style={{ transform: 'translateY(50px)' }} />
          </motion.div>
          <motion.div
            className="absolute bottom-0 left-32"
            animate={{
              x: [0, -8, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <TreePine className="text-[#a5d6a7]" size={350} style={{ transform: 'translateY(30px)' }} />
          </motion.div>
          <motion.div
            className="absolute bottom-0 left-64"
            animate={{
              x: [0, 12, 0],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <TreePine className="text-[#81c784]" size={300} />
          </motion.div>
        </div>

        {/* Large Castle Background Right Side */}
        <motion.div
          className="absolute right-0 top-10 w-1/3 opacity-12"
          animate={{
            y: [0, -20, 0],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Castle className="text-[#E5BA73]" size={500} />
        </motion.div>

        {/* Floating Cloud Layers */}
        <motion.div
          className="absolute top-10 left-1/4 w-96 h-32 bg-white rounded-full opacity-40 blur-2xl"
          animate={{
            x: [0, 100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-32 right-1/4 w-80 h-28 bg-white rounded-full opacity-30 blur-2xl"
          animate={{
            x: [0, -80, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Large Enchanted Garden Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20">
          <div className="flex justify-around items-end h-full">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`ground-flower-${i}`}
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, 0, -10, 0],
                }}
                transition={{
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              >
                <Flower2 className="text-[#E5BA73]" size={40 + (i % 3) * 10} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Garden Animals Scene */}
        <motion.div
          className="absolute bottom-16 left-1/4 opacity-20"
          animate={{
            x: [0, 50, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Rabbit className="text-[#a5d6a7]" size={80} />
        </motion.div>

        <motion.div
          className="absolute bottom-20 right-1/3 opacity-18"
          animate={{
            x: [0, -40, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Squirrel className="text-[#E5BA73]" size={70} />
        </motion.div>

        {/* Flying Birds Flock */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`bird-${i}`}
            className="absolute opacity-25"
            style={{
              top: `${15 + i * 8}%`,
            }}
            animate={{
              x: ['-100px', '110vw'],
              y: [0, -20, -10, -30, 0],
            }}
            transition={{
              duration: 18 + i * 3,
              repeat: Infinity,
              delay: i * 2,
              ease: "linear"
            }}
          >
            <Bird className="text-[#81c784]" size={35 + i * 5} />
          </motion.div>
        ))}

        {/* Magical Sparkle Effects */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          >
            <Star
              className="text-[#E5BA73]"
              size={8 + Math.random() * 12}
              fill="#E5BA73"
            />
          </motion.div>
        ))}

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-[#E5BA73]" />
            <span className="text-sm text-gray-600">Where Magic Comes to Play</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6 leading-tight">
            Welcome to
            <span className="block mt-2 bg-gradient-to-r from-[#81c784] via-[#a5d6a7] to-[#E5BA73] bg-clip-text text-transparent">
              Tinkerbell Garden
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            A premium enchanted play area where children's imaginations soar through magical indoor and outdoor adventures
          </p>

          <button
            onClick={() => setCurrentView('booking')}
            className="group relative px-8 py-4 bg-gradient-to-r from-[#81c784] to-[#a5d6a7] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <span className="flex items-center gap-2">
              Đặt vé
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </span>
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative px-6 py-20 bg-white overflow-hidden">
        {/* Large Forest Background Both Sides */}
        <div className="absolute left-0 top-0 bottom-0 w-1/4 opacity-10">
          <motion.div
            className="absolute top-0 left-0"
            animate={{
              y: [0, -20, 0],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <TreePine className="text-[#81c784]" size={350} />
          </motion.div>
          <motion.div
            className="absolute top-40 left-20"
            animate={{
              y: [0, -15, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <TreePine className="text-[#a5d6a7]" size={280} />
          </motion.div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/4 opacity-10">
          <motion.div
            className="absolute top-20 right-0"
            animate={{
              y: [0, -18, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <TreePine className="text-[#81c784]" size={320} />
          </motion.div>
          <motion.div
            className="absolute bottom-0 right-16"
            animate={{
              y: [0, -12, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <TreePine className="text-[#a5d6a7]" size={300} />
          </motion.div>
        </div>

        {/* Large Flower Garden Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-15 flex justify-around items-end">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`feature-flower-${i}`}
              animate={{
                scale: [1, 1.4, 1],
                rotate: [0, 15, 0, -15, 0],
              }}
              transition={{
                duration: 4 + (i % 3),
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            >
              <Flower2 className="text-[#E5BA73]" size={50 + (i % 4) * 10} />
            </motion.div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Magical Play Zones</h2>
            <p className="text-lg text-gray-600">Explore our enchanted areas designed for endless fun</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {facilityLoading && (
              <div className="md:col-span-2 lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center text-gray-600">
                Đang tải thông tin khu vui chơi...
              </div>
            )}

            {!facilityLoading && facilityMessage && (
              <div className="md:col-span-2 lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center text-red-700">
                {facilityMessage}
              </div>
            )}

            {!facilityLoading && !facilityMessage && facilityCards.length === 0 && (
              <div className="md:col-span-2 lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center text-gray-600">
                Chưa có thông tin khu vui chơi.
              </div>
            )}

            {!facilityLoading && !facilityMessage && facilityCards.map((facility) => {
              const Icon = facility.icon;
              return (
                <div
                  key={facility.id}
                  onClick={() => {
                    setSelectedFacility(facility);
                    setCurrentView('facility');
                  }}
                  className="group relative bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                    style={{ backgroundColor: facility.color + '20' }}
                  >
                    <Icon className="w-7 h-7" style={{ color: facility.color }} />
                  </div>

                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {facility.name}
                  </h3>

                  <p className="text-gray-600 mb-4">
                    {facility.description || 'Chưa có mô tả.'}
                  </p>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex rounded-full bg-[#eaf7ed] px-3 py-1 font-medium text-[#217a55]">
                      {facilityStatusLabel(facility.status)}
                    </span>
                    <span className="inline-flex rounded-full bg-[#fbf1df] px-3 py-1 font-medium text-[#76520b]">
                      {facilityAssetStatusLabel(facility.assetStatus)}
                    </span>
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                      Sức chứa: {facility.capacity ?? 0}
                    </span>
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl transition-all duration-300 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: facility.color }}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 px-6 py-12 border-t border-gray-100">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-[#E5BA73]" />
            <span className="text-2xl font-bold bg-gradient-to-r from-[#81c784] to-[#E5BA73] bg-clip-text text-transparent">
              Tinkerbell Garden
            </span>
          </div>
          <p className="text-gray-600">Where every visit sparkles with magic</p>
        </div>
      </footer>
    </div>
  );
}
