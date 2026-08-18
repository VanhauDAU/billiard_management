# System Scope V1 - Billiard Management

Cập nhật: **2026-08-19**

Tài liệu này là scope nghiệp vụ V1 chính thức đã được duyệt. Nếu code, migration hoặc tài liệu khác có sự khác biệt thì **SYSTEM_SCOPE_V1.md là nguồn quyết định nghiệp vụ ưu tiên**.

---

## 1. Mô hình Cửa Hàng (Store Boundary)

- Một `Store` đại diện cho một quán billiards tại **một địa điểm vật lý duy nhất**.
- V1 **hoàn toàn không có khái niệm chi nhánh (branch)**.
- Không có chức năng chọn chi nhánh hay dữ liệu phân vùng theo branch.
- Trong kiến trúc hệ thống, `Store` là ranh giới tenant độc lập và cô lập dữ liệu hoàn toàn.

---

## 2. Người Dùng, Vai Trò và Phân Quyền (RBAC)

### 2.1. Các vai trò mặc định
- **Owner (Chủ cửa hàng):** Toàn quyền quản trị quán, quản lý nhân sự, cấu hình bảng giá, xem toàn bộ báo cáo tài chính.
- **Manager (Quản lý):** Quản lý vận hành hàng ngày, nhân viên, thực đơn, duyệt hủy bill/điều chỉnh giờ.
- **Cashier (Thu ngân):** Thao tác tại quầy POS, mở bàn, gọi món, thanh toán và in hóa đơn.
- **Staff (Nhân viên phục vụ):** Xem trạng thái bàn, mở bàn, gọi món cho khách tại bàn.

### 2.2. Khả năng tùy chỉnh vai trò & phân quyền
- Chủ cửa hàng có thể tạo thêm các vai trò tùy chỉnh hoặc tùy biến danh sách quyền cho từng vai trò.
- Danh mục hơn 30+ quyền chi tiết thuộc các nhóm:
  - **Bàn & POS (`tables`):** `table.view`, `table.open`, `table.transfer`, `table.manage`, `table.order`, `session.adjust_time`.
  - **Hóa đơn (`invoices`):** `invoices.view`, `invoices.print`, `invoices.export`, `invoices.cancel`, `invoices.delete`.
  - **Mặt hàng (`products`):** `products.view`, `products.create`, `products.edit`, `products.delete`, `products.import_export`.
  - **Thực đơn (`menus`):** `menus.view`, `menus.create`, `menus.edit`, `menus.delete`.
  - **Danh mục (`categories`):** `categories.view`, `categories.create`, `categories.edit`, `categories.delete`.
  - **Khách hàng (`customers`):** `customers.view`, `customers.create`, `customers.edit_debt`, `customers.delete`, `customers.import_export`, `customers.groups.view`, `customers.groups.manage`.
  - **Quản trị quán (`store`):** `staff.manage`, `role.manage`, `report.view`, `store.settings.manage`.

---

## 3. Cơ Chế Đăng Nhập & Bảo Mật

### 3.1. Đăng nhập Quản trị (Owner / Manager)
- Sử dụng Tên đăng nhập (hoặc Email) + Mật khẩu.
- Dùng cho các màn hình quản trị cấu hình bàn, nhân viên, bảng giá và báo cáo.
- Mật khẩu băm PBKDF2-SHA256 với salt ngẫu nhiên.

### 3.2. Đăng nhập nhanh Nhân viên theo ca (Staff / Cashier)
- Thiết bị POS đã được kích hoạt trước cho cửa hàng.
- Màn hình hiển thị danh sách nhân viên của quán.
- Nhân viên chọn tên của mình và nhập mã PIN cá nhân (4-6 chữ số).
- Cơ chế khóa tài khoản tự động phía server khi nhập sai quá số lần quy định.

---

## 4. Quản Lý Bàn và Loại Bàn

- **Loại bàn (Table Types):** Cấu hình linh hoạt theo từng quán (ví dụ: Bàn Líp, Bàn Lỗ 9ft, Bàn Lỗ 8ft, Bàn Carom 3 Băng,...), có tên, mô tả và thứ tự sắp xếp.
- **Danh sách bàn (Billiard Tables):** Mỗi bàn có số bàn, tên bàn, loại bàn, thứ tự hiển thị và trạng thái.
- **Trạng thái vận hành của bàn:**
  - `available`: Bàn trống, sẵn sàng phục vụ khách.
  - `playing`: Bàn đang có khách chơi.
  - `disabled`: Bàn đang bảo trì / tạm khóa.

---

## 5. Cấu Hình Giá Giờ Chơi (Pricing)

- Hỗ trợ thiết lập bảng giá linh hoạt theo từng loại bàn:
  - Giá cơ bản theo giờ (VND/giờ).
  - Khung giờ đặc biệt (ví dụ: Giờ vàng ban đêm, giờ khuyến mãi ban ngày).
  - Giá theo ngày trong tuần (Thứ 2 - Thứ 6 vs Thứ 7 - Chủ nhật).
- **Nguyên tắc snapshot giá:** Khi mở bàn, cấu hình giá tại thời điểm đó sẽ được snapshot vào phiên chơi. Thay đổi bảng giá sau này không làm sai lệch hóa đơn của phiên đang chơi hoặc hóa đơn lịch sử.

---

## 6. Mở Bàn, Tính Giờ và Vận Hành Phiên Chơi

### 6.1. Mở bàn
- Nhân viên chọn bàn trống (`available`) → Bấm mở bàn.
- Hệ thống tạo `TableSession` với thời gian bắt đầu từ **đồng hồ phía Server**.
- Trạng thái bàn tự động chuyển sang `playing`.

### 6.2. Tính giờ và tiền bàn
- Màn hình POS hiển thị thời gian đã chơi (được tính từ server start time, không dựa vào timer local).
- Tiền bàn tạm tính được cập nhật liên tục theo bảng giá đã snapshot.

### 6.3. Gọi đồ ăn / Thức uống
- Nhân viên có thể thêm các món ăn, đồ uống, thuốc lá, dịch vụ vào bàn.
- Giá bán của mặt hàng tại thời điểm gọi món được snapshot vào bill item.

### 6.4. Điều chỉnh giờ & Chuyển bàn / Gộp bàn
- **Điều chỉnh thời gian:** Cho phép sửa giờ bắt đầu hoặc bù trừ phút (yêu cầu quyền `session.adjust_time` và lưu audit log).
- **Chuyển bàn:** Chuyển toàn bộ thời gian chơi và danh sách món từ Bàn A sang Bàn B.
- **Gộp bàn:** Gộp các phiên chơi của nhiều bàn về một hóa đơn thanh toán chung.
- **Tách bill:** V1 **không hỗ trợ** tách bill.

---

## 7. Thanh Toán và Đóng Bàn (Checkout)

- **Phương thức thanh toán hỗ trợ:**
  1. **Tiền mặt (Cash):** Thu ngân nhập số tiền khách đưa, hệ thống tính tiền thừa.
  2. **Chuyển khoản (Bank Transfer):** Hiển thị mã QR động chứa đúng số tiền cần thanh toán kèm nội dung thanh toán tự động.
- **Đóng phiên chơi (Finalize Transaction):**
  - Thực hiện nguyên tử: Ghi nhận thanh toán → Đóng hóa đơn (`Bill`) → Đóng phiên chơi (`TableSession`) → Chuyển trạng thái bàn về `available`.

---

## 8. In Hóa Đơn (80mm Thermal Receipt)

- In hóa đơn qua máy in nhiệt khổ 80mm từ ứng dụng Desktop POS.
- Cho phép in phiếu tạm tính cho khách xem trước và in hóa đơn thanh toán chính thức.
- Tùy biến mẫu in: Thông tin quán, logo, lời cảm ơn, mã QR thanh toán ngân hàng.

---

## 9. Báo Cáo Doanh Thu (Reports V1)

- Báo cáo doanh thu tổng quan theo ngày, tuần, tháng.
- Phân tích chi tiết: Doanh thu tiền giờ chơi vs Doanh thu đồ ăn thức uống.
- Thống kê phương thức thanh toán (Tiền mặt vs Chuyển khoản).
- Báo cáo tần suất sử dụng từng bàn và mặt hàng bán chạy nhất.
