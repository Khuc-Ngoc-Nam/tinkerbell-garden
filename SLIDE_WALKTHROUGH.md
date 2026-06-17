# Kịch bản Slide Thuyết trình - TinkerBell Garden

## Luồng demo chính

Câu chuyện demo: Gia đình bé Minh Anh đến TinkerBell Garden. Phụ huynh có tài khoản khách hàng, đăng ký sự kiện online, mua vé vào cổng, bé vào khu Góc sáng tạo tô tượng, phát sinh dịch vụ lẻ, cuối buổi ra về thì cashier check-out và hệ thống chốt toàn bộ bill hậu thanh toán. Manager theo dõi toàn bộ doanh thu ở dashboard.

## Slide 1 - Bản đồ chức năng hệ thống

Nói:

- Hệ thống chia thành 3 vai trò: Customer, Cashier, Manager.
- Customer dùng trang chủ để xem khu vui chơi, sự kiện, VIP.
- Cashier xử lý bán vé, check-in/out, POS dịch vụ, VIP tại quầy.
- Manager quản lý danh mục, sự kiện, nhân sự cashier, doanh thu.

Demo thao tác:

- Mở `http://localhost:5173`.
- Chỉ nhanh khu vực trang chủ: video hero, mục Sự kiện, mục Các khu vui chơi.
- Không cần đăng nhập ở slide này.

## Slide 2 - Khách hàng xem khu vui chơi

Nói:

- Khách hàng có thể xem các khu vui chơi đang hoạt động.
- Dữ liệu khu vui chơi lấy từ database, không phải card hard-code.
- Ảnh, mô tả, sức chứa và trạng thái được cập nhật từ màn Manager.

Demo thao tác:

- Ở trang chủ, kéo xuống mục `Các khu vui chơi`.
- Click card `Góc sáng tạo`.
- Trên trang chi tiết, chỉ vào ảnh khu vui chơi, mô tả, sức chứa, tình trạng.
- Click vào ảnh để mở lightbox, sau đó bấm nền tối hoặc nút đóng để tắt.

## Slide 3 - Khách xem dịch vụ tính phí trong khu vui chơi

Nói:

- Một khu vui chơi có thể có dịch vụ tính phí thêm.
- Ví dụ `Góc sáng tạo` có dịch vụ tô tượng, tranh cát.
- Khách xem trước được sản phẩm, giá và tồn kho.

Demo thao tác:

- Ở trang chi tiết `Góc sáng tạo`, tìm box `Một vài trò chơi tính phí thêm`.
- Click một dịch vụ, ví dụ `Tô tượng`.
- Hệ thống chuyển sang trang `/service/:serviceId`.
- Chỉ vào hero dùng ảnh dịch vụ làm background.
- Chỉ vào danh sách sản phẩm: `Tô tượng size nhỏ`, `Tô tượng size lớn`, giá và tồn kho.
- Click ảnh sản phẩm để demo lightbox.

## Slide 4 - Khách đăng ký sự kiện online

Nói:

- Sự kiện do Manager tạo ở admin, khách chỉ thấy sự kiện chưa kết thúc.
- Khách đọc nội dung marketing dạng bài viết HTML.
- Khách đặt vé online, nhập thông tin phụ huynh và danh sách bé.
- Hệ thống tính ưu đãi đăng ký sớm 20%, nếu là VIP thì giảm thêm 20%.

Demo thao tác:

- Quay lại trang chủ.
- Kéo tới mục `Sự kiện`.
- Click một sự kiện, ví dụ `Đêm hội Trung Thu`.
- Click nút `Đặt vé online ngay`.
- Nhập:
  - Họ tên phụ huynh: `Nguyễn Minh Anh`
  - SĐT: `0900000001`
  - Email: `parent@example.com`
  - Số vé đăng ký: `1` hoặc `2`
- Bấm `Đồng ý`.
- Điền bảng danh sách bé.
- Bấm `Đồng ý và thanh toán`.
- Chỉ vào thông báo chuyển khoản, ảnh QR `myQR.jpg`, nút `Đã chuyển tiền`.
- Bấm `Đã chuyển tiền` để hiển thị popup cảm ơn.

## Slide 5 - Manager xác nhận thanh toán sự kiện online

Nói:

- Khi khách chuyển khoản, đăng ký online chưa được tính doanh thu ngay.
- Manager kiểm tra tiền về tài khoản rồi tick `Đã thanh toán`.
- Chỉ khi tick, backend mới tạo giao dịch doanh thu sự kiện.
- Đồng thời hệ thống sinh một lượt chờ check-in ở quầy cổng.

Demo thao tác:

- Bấm `Đăng nhập`.
- Đăng nhập staff:
  - Username: `admin`
  - Password: `Admin@123`
- Vào sidebar `Sự kiện`.
- Kéo xuống bảng `Danh sách đăng ký online tham dự sự kiện`.
- Tìm SĐT vừa đăng ký.
- Tick checkbox `Đã thanh toán`.
- Nói rõ: lúc này dữ liệu đã được đẩy sang module Thu ngân cổng với trạng thái `Chưa check-in`.

## Slide 6 - Manager quản lý khu vui chơi

Nói:

- Manager quản lý danh mục khu vui chơi từ database.
- Có thể thêm/sửa/xóa khu, cập nhật sức chứa, trạng thái, CSVC.
- Nếu CSVC cần xử lý, hệ thống lưu danh sách vấn đề.
- Manager có thể phân cashier phụ trách từng khu.

Demo thao tác:

- Trên sidebar, click `Khu vui chơi`.
- Ở form `Quản lý khu vui chơi`, chọn `Góc sáng tạo`.
- Chỉ vào auto-fill mô tả, tình trạng, CSVC, sức chứa, nhân viên thu ngân.
- Đổi thử `CSVC` sang `CSVC cần xử lý`.
- Chỉ vào danh sách vấn đề checkbox và nút `+ Thêm vấn đề`.
- Không cần lưu nếu không muốn thay dữ liệu demo.
- Ở bảng bên phải, chỉ vào nút `Thêm ảnh`, `Sửa`, `Xóa`.

## Slide 7 - Manager quản lý dịch vụ và sản phẩm tính phí

Nói:

- Module dịch vụ tính phí dùng cấu trúc 3 tầng: Khu vui chơi -> Dịch vụ -> Sản phẩm.
- Manager tạo dịch vụ, upload ảnh dịch vụ.
- Manager tạo sản phẩm, cập nhật giá, tồn kho, ảnh sản phẩm.
- Cashier khu nào chỉ nhìn thấy dữ liệu của khu được phân công.

Demo thao tác:

- Click sidebar `Dịch vụ tính phí`.
- Ở tiêu đề, chỉ vào nút `+ Thêm dịch vụ` và `+ Thêm sản phẩm`.
- Ở trạng thái mặc định, chọn:
  - Khu vui chơi: `Góc sáng tạo`
  - Dịch vụ: `Tô tượng`
  - Sản phẩm: `Tô tượng size nhỏ`
- Chỉ vào auto-fill `Giá`, `Tồn kho`, input cập nhật ảnh.
- Ở bảng `Các dịch vụ tính phí`, chỉ cột `Thuộc khu vui chơi`, `Giá`, `Tồn kho`, thao tác sửa/xóa.

## Slide 8 - Cashier cổng tạo vé hậu thanh toán

Nói:

- Business logic hiện tại là post-paid.
- Khách vào chơi trước, thanh toán toàn bộ khi check-out.
- Khi bán vé đầu vào, cashier chỉ tạo vé, chưa ghi nhận doanh thu.

Demo thao tác:

- Đăng xuất Manager.
- Đăng nhập cashier cổng:
  - Username: `cashier_nam`
  - Password: `123456`
- Vào màn `Thu vé vào cổng` hoặc `Thu ngân`.
- Ở form `Bán vé và Check-in`, nhập username khách:
  - `nam195`
- Bấm `Tìm kiếm`.
- Chỉ vào nhãn VIP nếu tài khoản đang là VIP, hoặc nói hệ thống sẽ hiển thị nếu `IsVIP = true`.
- Tab `Mua vé vui chơi`:
  - Chọn `Vé 2 giờ`
  - Nhập số lượng vé
  - Bấm `Tạo vé`
- Nhấn mạnh: không có nút tiền mặt/chuyển khoản ở bước này.

## Slide 9 - Check-in khách vào cổng

Nói:

- Bảng bên phải là `Quản lý khách ra/vào`.
- Lượt mới tạo có trạng thái `Chưa check-in`.
- Cashier bấm `Check-in` để ghi nhận thời điểm bắt đầu chơi.

Demo thao tác:

- Ở bảng `Quản lý khách ra/vào`, tìm dòng vừa tạo.
- Chỉ cột `Loại vé`, `Tổng số tiền phải thanh toán`, `Check-in`.
- Click nút xanh `Check-in`.
- Sau khi bấm, cột check-in đổi từ `Chưa check-in` sang thời gian thực tế.
- Nút thao tác đổi thành `Check-out`.

## Slide 10 - Khách phát sinh dịch vụ ở khu Góc sáng tạo

Nói:

- Khi bé vào khu Góc sáng tạo tô tượng, cashier khu ghi nhận sản phẩm phát sinh.
- Khoản này chưa thu ngay, mà cộng vào bill cuối phiên của lượt chơi.
- Nếu khách là VIP, tổng bill cuối phiên được giảm 20%.

Demo thao tác:

- Đăng xuất cashier cổng.
- Đăng nhập cashier khu:
  - Username: `cashier_quan`
  - Password: `123456`
- Click tab `Thanh toán`.
- Tìm sản phẩm `Tô tượng size nhỏ`.
- Click sản phẩm để đưa vào giỏ.
- Dùng nút `+` hoặc `-` để chỉnh số lượng.
- Chọn hoặc nhập mã lượt chơi nếu form yêu cầu.
- Bấm nút ghi nhận/thanh toán để đẩy sản phẩm vào bill của session.
- Chỉ rõ: sản phẩm này sẽ xuất hiện ở phần `Tiền dịch vụ phát sinh` khi check-out.

## Slide 11 - Check-out và chốt bill cuối phiên

Nói:

- Khi khách ra về, cashier cổng check-out.
- Hệ thống tính:
  - Tiền vé vào cửa.
  - Tiền dịch vụ phát sinh.
  - Tiền phạt lố giờ nếu vé 2 giờ chơi quá 120 phút.
  - Giảm 20% nếu khách là VIP.
- Nếu tổng tiền bằng 0 thì chỉ xác nhận kết thúc, không tạo giao dịch.
- Nếu tổng tiền lớn hơn 0 thì chọn tiền mặt hoặc chuyển khoản.

Demo thao tác:

- Đăng nhập lại `cashier_nam` nếu đang ở cashier khu.
- Vào `Thu ngân`.
- Ở bảng `Quản lý khách ra/vào`, click nút đỏ/cam `Check-out`.
- Trong modal, chỉ vào:
  - Giờ check-in, giờ check-out.
  - Tổng thời gian chơi.
  - Tiền vé.
  - Tiền dịch vụ phát sinh.
  - Tiền phạt lố giờ.
  - Tổng cộng.
- Click `Tiền mặt` hoặc `Chuyển khoản`.
- Nếu chọn chuyển khoản, chỉ ảnh QR.
- Bấm `Xong` để hoàn tất.
- Nói rõ: lúc này record được ghi vào `Transactions`.

## Slide 12 - Đăng ký/Gia hạn VIP tại quầy

Nói:

- VIP có thể đăng ký online hoặc đăng ký/gia hạn tại quầy.
- Gói VIP có 3 lựa chọn: 1 năm, 2 năm, 3 năm.
- Khi gia hạn tại quầy, hệ thống cập nhật trực tiếp thời hạn VIP và ghi doanh thu VIP.

Demo thao tác:

- Ở màn cashier, cùng dòng tiêu đề `Thu ngân`, click `+ Đăng ký/ Gia hạn VIP`.
- Nhập username khách, ví dụ `nam195`.
- Chọn gói:
  - `1 năm - 400,000`
  - `2 năm - 750,000`
  - `3 năm - 1,000,000`
- Click `Đồng ý`.
- Chọn `Tiền mặt` hoặc `Chuyển khoản`.
- Bấm `Xong`.
- Chuyển sang tab `Khách hàng VIP`.
- Tìm `nam195` để thấy thời hạn VIP đã cập nhật.

## Slide 13 - Manager xem doanh thu tổng hợp

Nói:

- Toàn bộ giao dịch đã chốt đều đổ về module báo cáo.
- Dashboard hỗ trợ lọc real-time theo ngày, khách hàng, phương thức thanh toán, loại vé, sản phẩm, khu vui chơi.
- Có 3 bảng lịch sử và một bảng doanh thu tổng hợp.

Demo thao tác:

- Đăng nhập lại Manager `admin`.
- Click sidebar `Báo cáo & Thống kê`.
- Ở thanh lọc:
  - Chọn khoảng ngày.
  - Gõ khách hàng `nam195`.
  - Chọn phương thức `Tiền mặt` hoặc `Chuyển khoản`.
  - Chọn khu `Góc sáng tạo`.
- Chỉ vào bảng:
  - `Lịch sử thanh toán cổng vào`
  - `Lịch sử thanh toán dịch vụ tính phí`
  - `Lịch sử lượt chơi`
  - `Doanh thu Tổng hợp`
- Nhấn mạnh dòng tổng ở cuối mỗi bảng tự tính lại theo filter.

## Slide 14 - Tổng kết kỹ thuật khi kết thúc demo

Nói:

- Frontend dùng ReactJS, Vite, React Router, Axios và Vanilla CSS.
- Backend dùng Node.js Express, MySQL, `mysql2/promise`.
- File upload dùng Multer, ảnh serve qua `/uploads`.
- Auth dùng JWT, mật khẩu hash PBKDF2.
- Database thiết kế theo nghiệp vụ thật: facility, service, product, session, transaction, event, VIP.
- Docker Compose dựng đủ `client`, `server`, `db`.

Demo thao tác:

- Mở nhanh terminal hoặc Docker Desktop.
- Chỉ các container:
  - `tinkerbell_client`
  - `tinkerbell_server`
  - `tinkerbell_db`
- Có thể chạy:

```powershell
docker compose ps
```

## Checklist demo nhanh

Tài khoản nên dùng:

| Vai trò | Username | Password |
| --- | --- | --- |
| Manager | `admin` | `Admin@123` |
| Cashier cổng | `cashier_nam` | `123456` |
| Cashier Góc sáng tạo | `cashier_quan` | `123456` |
| Customer | `nam195` | `19052005` |

Thứ tự demo khuyến nghị:

1. Customer xem khu vui chơi.
2. Customer xem dịch vụ/sản phẩm.
3. Customer đăng ký sự kiện online.
4. Manager xác nhận thanh toán sự kiện.
5. Cashier cổng tạo vé và check-in.
6. Cashier khu thêm sản phẩm phát sinh.
7. Cashier cổng check-out và chốt bill.
8. Manager xem dashboard doanh thu.

Nếu thời gian thuyết trình ngắn, bỏ bớt slide 6, 7 và 12; giữ luồng chính từ slide 2 đến slide 5, slide 8 đến slide 11, rồi slide 13.
