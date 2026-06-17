# TinkerBell Garden

Full-stack web application cho hệ thống quản lý khu vui chơi TinkerBell Garden.

Stack chính:

- Frontend: ReactJS, Vite, React Router, Axios, Vanilla CSS
- Backend: Node.js, ExpressJS, MySQL với `mysql2/promise`
- Upload file: Multer, static files qua Express
- Deployment/dev environment: Docker Compose

## Use-case đã triển khai

### Khách hàng

- Xem trang chủ, danh sách khu vui chơi và danh sách sự kiện đang mở.
- Xem chi tiết khu vui chơi, hình ảnh, mô tả, sức chứa, tình trạng vận hành.
- Xem dịch vụ/sản phẩm tính phí thêm theo từng khu vui chơi.
- Xem chi tiết dịch vụ và danh sách sản phẩm kèm giá, tồn kho, hình ảnh.
- Click ảnh khu vui chơi, dịch vụ, sản phẩm để mở lightbox phóng to ảnh.
- Đăng ký tài khoản khách hàng, đăng nhập khách hàng.
- Đăng ký tham gia sự kiện online, nhập thông tin phụ huynh và danh sách bé.
- Nhận hướng dẫn chuyển khoản qua QR cho đăng ký sự kiện online.
- Đăng ký/gia hạn thành viên VIP online theo gói 1 năm, 2 năm, 3 năm.
- Xem trạng thái thành viên VIP và hạn sử dụng VIP.

### Manager

- Đăng nhập hệ thống staff với phân quyền Manager.
- Quản lý khu vui chơi:
  - Thêm, sửa, xóa khu vui chơi.
  - Cập nhật mô tả, trạng thái vận hành, tình trạng CSVC, sức chứa.
  - Upload ảnh khu vui chơi.
  - Gán cashier phụ trách từng khu.
  - Quản lý danh sách vấn đề CSVC và ẩn vấn đề đã xử lý.
- Quản lý dịch vụ tính phí:
  - Mô hình 3 tầng: Khu vui chơi -> Dịch vụ -> Sản phẩm.
  - Thêm dịch vụ theo khu vui chơi.
  - Upload ảnh dịch vụ.
  - Thêm, sửa, xóa sản phẩm.
  - Cập nhật giá, tồn kho, ảnh sản phẩm.
- Quản lý sự kiện và marketing:
  - Tạo, sửa, xóa sự kiện.
  - Cấu hình hình thức sự kiện, thời gian, hạn đăng ký, chi phí tham gia, giảm giá online.
  - Soạn nội dung marketing bằng rich text editor và lưu HTML.
  - Xem danh sách đăng ký online theo sự kiện.
  - Tìm kiếm đăng ký online theo số điện thoại.
  - Tick xác nhận đã thanh toán online, tự sinh doanh thu sự kiện và lượt chờ check-in ở quầy cổng.
- Quản lý booking sự kiện, trạng thái thanh toán và check-in.
- Quản lý khách hàng VIP:
  - Xem danh sách VIP.
  - Tìm kiếm khách hàng VIP theo username.
  - Đăng ký/gia hạn VIP tại quầy cho khách hàng đã có tài khoản.
- Báo cáo và thống kê:
  - Lọc theo khoảng ngày, khách hàng, phương thức thanh toán, loại vé, sản phẩm, khu vui chơi.
  - Xem lịch sử thanh toán cổng vào.
  - Xem lịch sử thanh toán dịch vụ tính phí.
  - Xem lịch sử lượt chơi và phí quá giờ.
  - Xem doanh thu tổng hợp: vé vào cửa, phí quá giờ, dịch vụ phát sinh, VIP, sự kiện, tổng doanh thu.

### Cashier

- Đăng nhập hệ thống staff với phân quyền Cashier.
- Cashier cổng:
  - Tìm khách hàng theo username, nhận diện VIP.
  - Tạo vé hậu thanh toán, trạng thái ban đầu là chưa check-in.
  - Chọn loại vé 2 giờ hoặc vé không giới hạn trong ngày.
  - Chọn sự kiện đang/sắp diễn ra cho khách mua trực tiếp tại cổng.
  - Check-in lượt chơi.
  - Check-out lượt chơi, hệ thống tính tổng thời gian chơi.
  - Tự động tính phí quá giờ cho vé 2 giờ theo block 30 phút.
  - Áp dụng giảm 20% nếu khách là VIP.
  - Chốt bill cuối phiên gồm tiền vé, dịch vụ phát sinh, phí quá giờ.
  - Thanh toán bằng tiền mặt hoặc chuyển khoản kèm QR.
  - Ghi nhận giao dịch vào bảng `Transactions`.
- Cashier khu vui chơi:
  - Chỉ thấy khu/dịch vụ/sản phẩm được phân công.
  - Tìm kiếm sản phẩm tính phí.
  - Thêm sản phẩm vào giỏ hàng POS.
  - Điều chỉnh số lượng, xóa sản phẩm khỏi giỏ.
  - Ghi nhận dịch vụ phát sinh vào bill của lượt chơi.
- Đăng ký/gia hạn VIP tại quầy và ghi nhận doanh thu VIP.

### Backend và dữ liệu

- JWT tự ký cho staff/customer.
- Hash mật khẩu bằng PBKDF2.
- API phân quyền theo role Manager/Cashier/Customer.
- MySQL schema đầy đủ cho staff, customer, ticket type, facility, service, product, event, session, transaction, VIP.
- Lưu ảnh upload vào `server/public/uploads`.
- Proxy `/api` và `/uploads` từ frontend sang backend.
- Docker Compose dựng đủ MySQL, backend và frontend.

## Cấu trúc thư mục

```text
tinkerbell-garden/
├─ client/                 # ReactJS + Vite frontend
├─ server/                 # Node.js Express backend
│  ├─ database.sql          # Schema + seed data
│  ├─ migrations/           # SQL bổ sung theo từng module
│  ├─ public/uploads/       # Ảnh upload bởi admin
│  └─ src/modules/          # Auth, facility, ticket, event, report, customer
├─ docker-compose.yml
└─ README.md
```

## Chạy bằng Docker Compose

Yêu cầu:

- Docker Desktop
- Docker Compose

Chạy toàn bộ hệ thống:

```powershell
docker compose up -d --build
```

Mở ứng dụng:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:5000/api/health`

Xem log:

```powershell
docker compose logs -f server
docker compose logs -f client
docker compose logs -f db
```

Dừng hệ thống:

```powershell
docker compose down
```

Xóa cả volume database để seed lại từ đầu:

```powershell
docker compose down -v
docker compose up -d --build
```

## Chạy local không dùng Docker

Yêu cầu:

- Node.js 20+
- npm
- MySQL 8+

### 1. Tạo database MySQL

Tạo database:

```sql
CREATE DATABASE tinkerbellgarden CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Import schema và seed data:

```powershell
mysql -u root -p tinkerbellgarden < server/database.sql
```

### 2. Cấu hình backend

Tạo hoặc cập nhật `server/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=tinkerbellgarden
DB_PORT=3306
CORS_ORIGIN=*
JWT_SECRET=change-this-secret-before-production

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Cài package và chạy backend:

```powershell
cd server
npm install
npm run dev
```

Hoặc chạy production mode:

```powershell
npm start
```

### 3. Cấu hình frontend

Khi chạy Vite local, proxy API cần trỏ về backend local:

```powershell
cd client
npm install
$env:VITE_API_PROXY_TARGET="http://localhost:5000"
npm run dev
```

Mở:

```text
http://localhost:5173
```

Build frontend:

```powershell
cd client
npm run build
```

Lint frontend:

```powershell
cd client
npm run lint
```

## Tài khoản seed để demo

### Manager

| Username | Password |
| --- | --- |
| `admin` | `Admin@123` |

### Cashier

| Username | Password | Phân công |
| --- | --- | --- |
| `cashier` | `Cashier@123` | Cổng chính |
| `cashier_nam` | `123456` | Cổng chính |
| `cashier_quan` | `123456` | Góc sáng tạo |
| `cashier_vinh` | `123456` | Nhà bóng |
| `cashier_ha` | `123456` | Cầu trượt liên hoàn |
| `cashier_sex` | `123456` | Game điện tử |

### Customer

| Username/Email/Phone | Password |
| --- | --- |
| `parent@example.com` | `Customer@123` |
| `nam195` | `19052005` |

## API chính

| Nhóm | Endpoint |
| --- | --- |
| Auth | `/api/auth/login`, `/api/auth/me`, `/api/auth/customer/register` |
| Portal | `/api/portal/info`, `/api/portal/events`, `/api/portal/events/:id/register` |
| Facility | `/api/facilities`, `/api/facilities/:id/image` |
| Paid service | `/api/facilities/paid-services/services`, `/api/facilities/paid-services/items` |
| Ticket/POS | `/api/tickets/sessions`, `/api/tickets/sessions/:id/checkin`, `/api/tickets/sessions/:id/checkout` |
| Event | `/api/events`, `/api/events/registrations/online` |
| Customer/VIP | `/api/customers`, `/api/customers/vip`, `/api/customers/vip/counter-renew` |
| Report | `/api/reports/dashboard`, `/api/reports/visitors`, `/api/reports/revenue` |

## Ghi chú vận hành

- Source dùng Vanilla CSS, không dùng Tailwind, Bootstrap, MUI hoặc component UI framework trong app chính.
- Thư mục `client/Tinkerbell Garden Ticket Sales/` là tài liệu/tham chiếu giao diện cũ, không phải app chính đang chạy.
- File upload được mount qua Docker ở `server/public/uploads`.
- Nếu thay `server/database.sql`, cần xóa volume MySQL bằng `docker compose down -v` để container seed lại từ đầu.
- Không dùng `server/.env` thật cho production. Nên tạo `.env.example` và thay `JWT_SECRET`, database password, seed passwords khi deploy.
