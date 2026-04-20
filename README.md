# Cấu trúc thư mục của dự án

## Thư mục lớn
tinkerbell-garden/
├── client/                 # Frontend App (Web tĩnh & Portal cho Admin/Thu ngân)
├── server/                 # Backend API (Xử lý toàn bộ logic, tính toán)
├── docs/                   # Chứa tài liệu SRS, sơ đồ Database, Use Case
└── README.md



## Thư mục con
server/                     # Backend
├── src/
│   ├── config/             # Cấu hình Database, biến môi trường, Mailer
│   ├── middlewares/        # Phân quyền (Auth), xử lý lỗi (Error Handler)
│   ├── utils/              # Các hàm dùng chung (format ngày, mã hóa mật khẩu)
│   │
│   ├── modules/            # PHÂN CHIA THEO MODULE & USE CASE
│   │   │
│   │   ├── auth/           # Đăng nhập Admin / Cashier
│   │   │
│   │   ├── portal/         # [Module 1] Cổng thông tin & Khách hàng
│   │   │   ├── portal.controller.js  # (UC1.1, UC1.2) API lấy thông tin khu vui chơi, sự kiện cho web
│   │   │   ├── portal.service.js
│   │   │   └── portal.routes.js
│   │   │
│   │   ├── ticket/         # [Module 2] Quản lý Bán vé & Thu ngân (CORE)
│   │   │   ├── ticket.controller.js  # Xử lý API request
│   │   │   ├── ticket.service.js     # Chứa logic tính phí phạt, thời gian tích luỹ
│   │   │   ├── ticket.model.js       # Schema lưu vé và giao dịch
│   │   │   └── ticket.routes.js
│   │   │   # Phục vụ: 
│   │   │   # - UC2.1, UC2.2: Bán vé và dịch vụ
│   │   │   # - UC2.3: Check-in
│   │   │   # - UC2.4: Check-out & Tính tiền luỹ tiến
│   │   │
│   │   ├── customer/       # Quản lý khách hàng & thẻ VIP
│   │   │   ├── customer.controller.js
│   │   │   ├── customer.service.js   # Logic đăng ký VIP, kiểm tra hạn VIP
│   │   │   ├── customer.model.js
│   │   │   └── customer.routes.js
│   │   │   # Phục vụ: UC1.4 (Mua online), UC2.5 (Mua tại quầy)
│   │   │
│   │   ├── facility/       # [Module 3] Quản lý Cơ sở vật chất & Trò chơi
│   │   │   ├── facility.controller.js
│   │   │   ├── facility.service.js
│   │   │   ├── facility.model.js
│   │   │   └── facility.routes.js
│   │   │   # Phục vụ: UC3.1 (DS trò chơi), UC3.2 (Trạng thái hỏng), UC3.3 (Dịch vụ tính phí)
│   │   │
│   │   ├── event/          # [Module 4] Quản lý Sự kiện
│   │   │   ├── event.controller.js
│   │   │   ├── event.service.js      # Logic tạo booking, gửi email xác nhận, QR Code
│   │   │   ├── event.model.js
│   │   │   └── event.routes.js
│   │   │   # Phục vụ: UC1.3 (Khách book sự kiện), UC4.1 (Tạo sự kiện), UC4.2 (Duyệt mail)
│   │   │
│   │   └── report/         # [Module 5] Báo cáo & Thống kê
│   │       ├── report.controller.js
│   │       ├── report.service.js     # Query tổng hợp doanh thu cuối ngày
│   │       └── report.routes.js
│   │       # Phục vụ: UC5.1, UC5.2
│   │
│   ├── jobs/               # Background Jobs (Cronjob)
│   │   └── vip-renewal.job.js        # Chạy tự động đêm 31/12 để reset thẻ VIP
│   │
│   └── app.js              # Entry point kết nối các routes
├── package.json
└── .env

client/                     # Frontend
├── public/
├── src/
│   ├── assets/             # Hình ảnh (logo, banner sự kiện), css, fonts
│   ├── components/         # Các UI component dùng chung (Button, Table, Modal, Toast)
│   ├── layouts/            # Layout bọc ngoài các trang
│   │   ├── PortalLayout/   # Layout cho Web tĩnh (Header, Footer cho phụ huynh)
│   │   └── AdminLayout/    # Layout cho Trang quản trị (Sidebar, Navbar cho nhân viên)
│   ├── services/           # Cấu hình gọi API (Axios instance, Interceptors)
│   │
│   ├── modules/            # PHÂN CHIA COMPONENT VÀ PAGE THEO USE CASE
│   │   │
│   │   ├── portal/         # [Giao diện Phụ huynh]
│   │   │   ├── pages/
│   │   │   │   ├── HomePage.jsx      # (UC1.1) Giới thiệu, bảng giá
│   │   │   │   ├── EventsPage.jsx    # (UC1.2) Danh sách sự kiện
│   │   │   │   ├── EventBooking.jsx  # (UC1.3) Form đăng ký nhận mã QR
│   │   │   │   └── VipRegister.jsx   # (UC1.4) Form mua thẻ VIP online
│   │   │   └── components/
│   │   │
│   │   ├── cashier/        # [Giao diện Thu ngân]
│   │   │   ├── pages/
│   │   │   │   ├── Ticketing.jsx     # (UC2.1, UC2.2) Giao diện bán vé, chọn dịch vụ
│   │   │   │   ├── CheckIn.jsx       # (UC2.3) Quét mã, bắt đầu tính giờ
│   │   │   │   ├── CheckOut.jsx      # (UC2.4) Tính tiền phạt luỹ tiến, in bill
│   │   │   │   └── VipManager.jsx    # (UC2.5) Đăng ký thẻ VIP tại quầy
│   │   │   └── components/
│   │   │       ├── PenaltyCalculatorModal.jsx # Component hiển thị preview tiền phạt
│   │   │
│   │   ├── facility/       # [Giao diện Quản lý Cơ sở vật chất]
│   │   │   ├── pages/
│   │   │   │   ├── GamesManager.jsx  # (UC3.1) Bảng danh sách trò chơi
│   │   │   │   ├── StatusReport.jsx  # (UC3.2) Cập nhật hỏng hóc
│   │   │   │   └── Services.jsx      # (UC3.3) Quản lý giá dịch vụ phụ
│   │   │
│   │   ├── event/          # [Giao diện Quản lý Sự kiện]
│   │   │   ├── pages/
│   │   │   │   ├── EventCampaigns.jsx # (UC4.1) Thêm, sửa, xoá sự kiện
│   │   │   │   └── BookingsList.jsx   # (UC4.2) Quét và xác thực email phụ huynh
│   │   │
│   │   └── report/         # [Giao diện Báo cáo]
│   │       ├── pages/
│   │       │   ├── DailyRevenue.jsx   # (UC5.2) Bảng doanh thu, xuất file Excel
│   │       │   └── VisitorStats.jsx   # (UC5.1) Biểu đồ lượng khách
│   │
│   ├── routes/             # Định tuyến URL (React Router)
│   │   ├── index.js        # Cấu hình route /admin, /cashier, /...
│   │   └── PrivateRoute.jsx # Chặn quyền không cho người ngoài vào Admin
│   │
│   └── utils/              # Các hàm format tiền VNĐ, format giờ
├── package.json
└── vite.config.js