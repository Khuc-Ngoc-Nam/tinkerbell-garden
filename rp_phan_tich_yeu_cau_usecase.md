# Phân tích yêu cầu và Use-case - TinkerBell Garden

## 1. Phân tích yêu cầu hệ thống và bài toán

### 1.1. Bối cảnh nghiệp vụ

TinkerBell Garden là hệ thống quản lý khu vui chơi trẻ em có nhiều nghiệp vụ diễn ra đồng thời: bán vé vào cổng, kiểm soát lượt ra/vào, quản lý các khu vui chơi, bán dịch vụ tính phí riêng tại từng khu, tổ chức sự kiện, quản lý khách hàng VIP và tổng hợp doanh thu. Khác với mô hình bán vé đơn giản, hệ thống này phải xử lý cả các khoản phát sinh trong quá trình khách đang chơi, ví dụ sản phẩm tô tượng, tranh tô màu, game điện tử, phí quá giờ hoặc đăng ký/gia hạn VIP.

Đặc điểm quan trọng của bài toán là mô hình thanh toán đã được chuyển từ trả trước sang hậu thanh toán. Khách hàng có thể được tạo vé, check-in vào khu vui chơi, sử dụng thêm dịch vụ trong quá trình chơi và chỉ thanh toán toàn bộ bill khi check-out. Vì vậy, hệ thống không thể chỉ ghi nhận doanh thu tại thời điểm mua vé ban đầu, mà cần có một bản ghi lượt chơi trung tâm để gom toàn bộ chi phí phát sinh trước khi chốt giao dịch.

### 1.2. Vấn đề và rủi ro trong quản lý thủ công

Nếu quản lý bằng bảng tính hoặc thao tác rời rạc giữa các quầy, hệ thống vận hành có thể phát sinh các rủi ro sau:

- Thất thoát doanh thu do dịch vụ phát sinh trong khu vui chơi không được cộng vào bill cuối.
- Nhầm lẫn giữa khách đã mua vé, khách đã check-in và khách đã thanh toán.
- Khó kiểm soát phí lố giờ đối với vé giới hạn thời gian, đặc biệt khi tính theo block và có ưu đãi VIP.
- Không đồng bộ giữa đăng ký sự kiện online và danh sách khách cần check-in tại quầy cổng.
- Thiếu cơ chế phân quyền giữa Manager, Cashier cổng và Cashier khu vui chơi.
- Không có nguồn dữ liệu thống nhất để lập báo cáo doanh thu theo vé, dịch vụ, VIP, sự kiện và phí quá giờ.

### 1.3. Hướng giải quyết của hệ thống TinkerBell Garden

Hệ thống TinkerBell Garden giải quyết bài toán bằng cách tổ chức dữ liệu xoay quanh lượt chơi và giao dịch. Khi thu ngân cổng tạo vé, hệ thống chỉ tạo bản ghi `PlaySession` ở trạng thái chưa check-in, chưa ghi nhận doanh thu. Khi khách vào cổng, thu ngân thực hiện check-in để cập nhật thời điểm bắt đầu chơi. Trong quá trình khách sử dụng dịch vụ tại các khu, POS nội bộ ghi các dòng phát sinh vào `SessionService`, đồng thời cập nhật tồn kho sản phẩm. Đến thời điểm check-out, hệ thống tổng hợp tiền vé, tiền dịch vụ phát sinh, phí lố giờ và ưu đãi VIP để tạo hóa đơn cuối cùng, sau đó mới ghi doanh thu vào `Transactions`.

Cơ chế này giúp tách rõ ba khái niệm: tạo vé, bắt đầu lượt chơi và thanh toán cuối phiên. Đây là điểm quan trọng để hạn chế thất thoát doanh thu trong mô hình hậu thanh toán.

Đối với sự kiện, hệ thống cho phép khách hàng đăng ký online, nhập thông tin phụ huynh và danh sách bé tham gia. Khi Manager xác nhận thanh toán online, backend tự động tạo giao dịch doanh thu sự kiện và sinh một lượt chờ check-in tại quầy cổng. Nhờ đó, thu ngân không cần nhập lại thông tin khách sự kiện, đồng thời vẫn đảm bảo dữ liệu sự kiện đi vào luồng kiểm soát ra/vào thống nhất.

Đối với khách hàng VIP, hệ thống lưu trạng thái VIP và hạn sử dụng trên hồ sơ khách hàng. Khi checkout hoặc đăng ký sự kiện, hệ thống có thể áp dụng chính sách giảm giá 20% theo trạng thái VIP. Việc đăng ký/gia hạn VIP có thể thực hiện online hoặc tại quầy, và các giao dịch VIP được ghi nhận vào module doanh thu.

### 1.4. Phạm vi chức năng chính

Các nhóm chức năng đã được triển khai trong source code bao gồm:

- Quản lý tài khoản và phân quyền Manager, Cashier, Customer.
- Quản lý khu vui chơi, trạng thái vận hành, CSVC, sức chứa, hình ảnh và cashier phụ trách.
- Quản lý dịch vụ tính phí theo cấu trúc ba tầng: khu vui chơi, dịch vụ, sản phẩm.
- POS dịch vụ trong khu vui chơi, tìm sản phẩm, thêm giỏ hàng và ghi nhận phát sinh vào lượt chơi.
- Bán vé hậu thanh toán, check-in, check-out và tính phí lố giờ.
- Quản lý đăng ký sự kiện online, xác nhận thanh toán và tạo lượt chờ check-in.
- Đăng ký/gia hạn VIP online và tại quầy.
- Báo cáo doanh thu tổng hợp và các bảng lịch sử thanh toán.

### 1.5. Yêu cầu phi chức năng

Về giao diện, hệ thống được xây dựng bằng ReactJS, Vite và Vanilla CSS, không phụ thuộc vào thư viện UI bên ngoài. Các màn hình chính cần đáp ứng responsive để sử dụng được trên desktop và kích thước màn hình nhỏ hơn. Những khu vực có mật độ thao tác cao như POS, check-in/check-out, dashboard thống kê được thiết kế theo hướng rõ ràng, ưu tiên bảng dữ liệu, form nhập liệu và modal xác nhận.

Về tốc độ xử lý, một phần tính toán hiển thị được thực hiện realtime tại client. Dashboard sử dụng các hàm xử lý mảng như `filter`, `reduce` và `useMemo` để lọc dữ liệu theo ngày, khách hàng, phương thức thanh toán, loại vé, sản phẩm và khu vui chơi mà không cần gọi lại API cho mỗi thao tác nhỏ. POS dịch vụ cũng tính tổng tiền giỏ hàng tức thời khi cashier thay đổi số lượng sản phẩm.

Về độ tin cậy nghiệp vụ, các phép tính có ảnh hưởng đến dữ liệu cuối cùng như checkout, phí lố giờ, cập nhật trạng thái lượt chơi và ghi nhận doanh thu vẫn được backend xử lý và lưu vào MySQL. Điều này giúp giao diện phản hồi nhanh nhưng dữ liệu chính thức vẫn được kiểm soát ở server.

Về bảo mật và phân quyền, backend sử dụng JWT để xác thực người dùng và kiểm tra role. Manager có quyền quản trị toàn bộ dữ liệu, trong khi Cashier chỉ được thao tác với nghiệp vụ phù hợp, ví dụ cashier khu vui chơi chỉ nhìn thấy dịch vụ và sản phẩm thuộc khu được phân công. Mật khẩu người dùng được lưu dưới dạng hash PBKDF2 thay vì text thuần.

## 2. Phân tích use-case

### 2.1. Actor của hệ thống

| Actor | Vai trò | Quyền và trách nhiệm chính |
| --- | --- | --- |
| Admin/Manager | Người quản lý hệ thống | Quản lý khu vui chơi, dịch vụ, sản phẩm, sự kiện, cashier, VIP, xác nhận thanh toán online và xem báo cáo doanh thu. |
| Cashier | Nhân viên thu ngân | Tạo vé, check-in/check-out, bán dịch vụ phát sinh, gia hạn VIP tại quầy và xử lý thanh toán theo phạm vi được phân công. |
| Customer | Khách hàng/phụ huynh | Xem trang chủ, xem khu vui chơi, xem dịch vụ tính phí, đăng ký sự kiện online, đăng ký/gia hạn VIP và theo dõi trạng thái tài khoản. |

Trong nhóm Cashier có thể tách thành hai ngữ cảnh sử dụng:

- Cashier cổng: phụ trách tạo vé, check-in, check-out và thanh toán cuối phiên.
- Cashier khu vui chơi: phụ trách POS dịch vụ phát sinh tại khu được phân công, ví dụ Góc sáng tạo hoặc Game điện tử.

### 2.2. Use-case UC1: Bán vé hậu thanh toán và check-in

| Thành phần | Mô tả |
| --- | --- |
| Actor chính | Cashier cổng |
| Mục tiêu | Tạo lượt chơi cho khách nhưng chưa thu tiền ngay tại đầu vào. |
| Tiền điều kiện | Cashier đã đăng nhập; hệ thống có danh sách loại vé đang hoạt động. |
| Luồng chính | Cashier nhập username khách hàng nếu có, chọn loại vé hoặc sự kiện, nhập số lượng vé, sau đó bấm tạo vé. Hệ thống tạo `PlaySession` trạng thái `Pending`. Khi khách bắt đầu vào cổng, cashier bấm check-in để cập nhật `CheckinTime` và chuyển trạng thái sang `Playing`. |
| Kết quả | Lượt chơi được ghi nhận trong bảng quản lý khách ra/vào nhưng chưa phát sinh doanh thu trong `Transactions`. |
| Giá trị nghiệp vụ | Phù hợp với mô hình hậu thanh toán, tránh ghi nhận doanh thu sai thời điểm. |

### 2.3. Use-case UC2: Check-out và tính tiền lố giờ

| Thành phần | Mô tả |
| --- | --- |
| Actor chính | Cashier cổng |
| Mục tiêu | Chốt toàn bộ bill cuối phiên cho khách khi ra về. |
| Tiền điều kiện | Lượt chơi đang ở trạng thái `Playing` và đã có thời điểm check-in. |
| Luồng chính | Cashier bấm check-out. Hệ thống lấy thời điểm hiện tại làm giờ ra, tính tổng số phút chơi, xác định tiền vé, tiền dịch vụ phát sinh, phí lố giờ và ưu đãi VIP nếu có. Nếu tổng tiền lớn hơn 0, cashier chọn tiền mặt hoặc chuyển khoản để xác nhận thanh toán. |
| Luồng tính phí lố giờ | Vé không giới hạn trong ngày không bị phạt. Vé 2 giờ chỉ bị phạt nếu tổng thời gian chơi lớn hơn 120 phút. Số phút lố được làm tròn theo block 30 phút, mỗi block 50.000 đồng, sau đó giảm 20% nếu khách là VIP. |
| Kết quả | Hệ thống cập nhật `PlaySession` sang `Completed`, tạo `TicketInvoice` và ghi các dòng doanh thu vào `Transactions`. |
| Giá trị nghiệp vụ | Đảm bảo tiền vé, dịch vụ phát sinh và phí quá giờ đều được cộng vào bill cuối. |

### 2.4. Use-case UC3: Bán dịch vụ phát sinh tại khu vui chơi

| Thành phần | Mô tả |
| --- | --- |
| Actor chính | Cashier khu vui chơi |
| Mục tiêu | Ghi nhận sản phẩm/dịch vụ khách sử dụng trong quá trình chơi. |
| Tiền điều kiện | Cashier đã được phân công khu; khách đang có lượt chơi `Playing`. |
| Luồng chính | Cashier tìm sản phẩm, thêm vào giỏ hàng, điều chỉnh số lượng và xác nhận. Hệ thống ghi dòng phát sinh vào `SessionService` của lượt chơi tương ứng và cập nhật tồn kho sản phẩm. |
| Kết quả | Chi phí dịch vụ chưa thu ngay mà được cộng vào bill khi khách check-out. |
| Giá trị nghiệp vụ | Kết nối POS bên trong với checkout cổng, hạn chế thất thoát doanh thu dịch vụ lẻ. |

### 2.5. Use-case UC4: Gia hạn hoặc đăng ký VIP

| Thành phần | Mô tả |
| --- | --- |
| Actor chính | Customer, Cashier, Manager |
| Mục tiêu | Cho phép khách đăng ký hoặc gia hạn VIP để được hưởng ưu đãi trong hệ thống. |
| Tiền điều kiện | Khách hàng có tài khoản trong hệ thống. |
| Luồng online | Customer vào trang thành viên VIP, chọn gói 1 năm, 2 năm hoặc 3 năm, xem hướng dẫn chuyển khoản và gửi yêu cầu thanh toán. |
| Luồng tại quầy | Cashier nhập username, chọn gói gia hạn, chọn phương thức thanh toán và xác nhận. Hệ thống cập nhật `IsVIP`, `VIPExpiryDate`, tạo `VIPTransaction` và ghi doanh thu type `VIP`. |
| Kết quả | Khách được cập nhật trạng thái VIP và có thể được giảm giá 20% ở các nghiệp vụ liên quan. |
| Giá trị nghiệp vụ | Tăng khả năng giữ chân khách hàng và tạo thêm nguồn doanh thu định kỳ. |

### 2.6. Use-case UC5: Đăng ký sự kiện online

| Thành phần | Mô tả |
| --- | --- |
| Actor chính | Customer, Manager |
| Mục tiêu | Cho phép khách đăng ký sự kiện qua trang chủ và đồng bộ dữ liệu sang quầy cổng. |
| Tiền điều kiện | Sự kiện ở trạng thái công khai và chưa kết thúc. |
| Luồng khách hàng | Customer xem danh sách sự kiện, mở chi tiết, đọc nội dung marketing, bấm đặt vé online, nhập thông tin phụ huynh và danh sách bé, sau đó nhận hướng dẫn chuyển khoản. |
| Luồng Manager | Manager xem danh sách đăng ký online, tìm theo số điện thoại và tick xác nhận đã thanh toán khi đối soát tiền. |
| Kết quả | Hệ thống tạo giao dịch doanh thu sự kiện và tự động sinh một lượt chờ check-in tại quầy cổng với cờ đã thanh toán online. |
| Giá trị nghiệp vụ | Rút ngắn thao tác tại quầy, đồng thời đảm bảo doanh thu sự kiện được ghi nhận vào báo cáo. |

### 2.7. Use-case UC6: Thống kê doanh thu

| Thành phần | Mô tả |
| --- | --- |
| Actor chính | Manager |
| Mục tiêu | Theo dõi lịch sử thanh toán và doanh thu tổng hợp theo nhiều chiều lọc. |
| Tiền điều kiện | Hệ thống đã có dữ liệu giao dịch trong `Transactions` và dữ liệu lượt chơi/dịch vụ liên quan. |
| Luồng chính | Manager mở dashboard, dùng bộ lọc theo ngày, khách hàng, phương thức thanh toán, loại vé, sản phẩm và khu vui chơi. Giao diện realtime cập nhật các bảng lịch sử và doanh thu tổng hợp. |
| Kết quả | Manager xem được doanh thu vé vào cửa, dịch vụ phát sinh, phí quá giờ, VIP, sự kiện và tổng doanh thu. |
| Giá trị nghiệp vụ | Hỗ trợ chốt ca, chốt ngày và kiểm soát nguồn tiền theo từng nghiệp vụ. |

## 3. User stories

1. Là một Thu ngân cổng, tôi muốn tạo vé cho khách ở trạng thái chưa check-in để khách có thể vào chơi theo mô hình thanh toán sau mà chưa cần ghi nhận doanh thu ngay.

2. Là một Thu ngân cổng, tôi muốn hệ thống tự động tính tổng tiền tại màn hình check-out để tôi có thể thu đúng số tiền bao gồm tiền vé, dịch vụ phát sinh và phí phạt lố giờ.

3. Là một Thu ngân khu vui chơi, tôi muốn tìm kiếm sản phẩm và thêm vào bill của khách đang chơi để mọi dịch vụ phát sinh trong khu đều được ghi nhận về lượt chơi của khách.

4. Là một Quản lý, tôi muốn xác nhận đăng ký sự kiện online đã thanh toán để hệ thống tự động ghi nhận doanh thu sự kiện và tạo lượt chờ check-in cho khách tại quầy cổng.

5. Là một Khách hàng, tôi muốn xem chi tiết khu vui chơi, dịch vụ tính phí và sản phẩm kèm hình ảnh để có thể biết trước các hoạt động và chi phí phát sinh trước khi đến khu vui chơi.

6. Là một Khách hàng, tôi muốn đăng ký hoặc gia hạn thành viên VIP để nhận ưu đãi giảm giá 20% cho các hoạt động phù hợp trong hệ thống.

7. Là một Quản lý, tôi muốn lọc báo cáo doanh thu theo thời gian, phương thức thanh toán, loại vé, sản phẩm và khu vui chơi để có thể đối soát doanh thu chính xác theo từng ca hoặc từng ngày.
