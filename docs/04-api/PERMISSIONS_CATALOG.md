# Danh Mục Quyền Hạn (Permission Catalog)

Cập nhật: **2026-08-19**

Tài liệu này liệt kê toàn bộ danh mục quyền hạn được định nghĩa trong `permission_catalog` (D1 Control Plane), phục vụ phân quyền theo vai trò (RBAC) trên toàn hệ thống.

---

## 1. Bàn & Vận Hành POS (`tables`)

| Permission Key | Tên hiển thị | Mô tả chi tiết |
|---|---|---|
| `table.view` | Xem trạng thái bàn | Xem sơ đồ và trạng thái hiện tại của bàn trên POS |
| `table.open` | Mở bàn tính giờ | Mở bàn cho khách và bắt đầu tính tiền giờ |
| `table.transfer` | Chuyển bàn / gộp bàn | Chuyển đổi hoặc gộp phiên chơi giữa các bàn |
| `table.manage` | Quản lý cấu hình bàn | Thêm, sửa, xóa bàn và loại bàn trong quán |
| `table.order` | Gọi món / dịch vụ tại bàn | Thêm món ăn đồ uống vào bàn đang chơi |
| `session.adjust_time` | Điều chỉnh giờ chơi | Chỉnh sửa giờ bắt đầu hoặc thời gian phiên chơi (yêu cầu quyền đặc biệt) |

---

## 2. Hóa Đơn & Thanh Toán (`invoices`)

| Permission Key | Tên hiển thị | Mô tả chi tiết |
|---|---|---|
| `invoices.view` | Xem hóa đơn | Xem danh sách và chi tiết các hóa đơn bán hàng |
| `invoices.print` | In biên lai | In phiếu tạm tính hoặc hóa đơn thanh toán 80mm |
| `invoices.export` | Xuất danh sách hóa đơn | Xuất dữ liệu hóa đơn ra file Excel / CSV |
| `invoices.cancel` | Hủy hóa đơn | Hủy hóa đơn chưa thanh toán hoặc hóa đơn lỗi (yêu cầu mã PIN quản lý) |
| `invoices.delete` | Xóa hóa đơn | Xóa vĩnh viễn hóa đơn khỏi hệ thống (chỉ dành cho Owner) |

---

## 3. Mặt Hàng & Sản Phẩm (`products`)

| Permission Key | Tên hiển thị | Mô tả chi tiết |
|---|---|---|
| `products.view` | Xem danh sách mặt hàng | Xem thông tin menu, giá bán các sản phẩm dịch vụ |
| `products.create` | Tạo mặt hàng mới | Thêm mới mặt hàng vào thực đơn của quán |
| `products.edit` | Chỉnh sửa mặt hàng | Cập nhật giá bán, tên, đơn vị tính của mặt hàng |
| `products.delete` | Xóa mặt hàng | Xóa sản phẩm khỏi danh sách phục vụ |
| `products.import_export` | Nhập / Xuất mặt hàng | Import hoặc Export danh sách mặt hàng qua Excel |

---

## 4. Thực Đơn (`menus`)

| Permission Key | Tên hiển thị | Mô tả chi tiết |
|---|---|---|
| `menus.view` | Xem danh sách thực đơn | Xem các loại thực đơn (Đồ ăn, Đồ uống, Cafe, Ăn tại bàn, Mang đi) |
| `menus.create` | Tạo mới thực đơn | Tạo loại thực đơn mới |
| `menus.edit` | Chỉnh sửa thực đơn | Cập nhật tên, mô tả loại thực đơn |
| `menus.delete` | Xóa thực đơn | Xóa loại thực đơn |

---

## 5. Danh Mục Phân Loại (`categories`)

| Permission Key | Tên hiển thị | Mô tả chi tiết |
|---|---|---|
| `categories.view` | Xem danh mục phân loại | Xem danh mục hàng hóa (Thịt, Rau củ, Nước lon, Snack) |
| `categories.create` | Tạo mới danh mục | Tạo danh mục phân loại sản phẩm |
| `categories.edit` | Chỉnh sửa danh mục | Đổi tên và thuộc tính danh mục |
| `categories.delete` | Xóa danh mục | Xóa danh mục phân loại |

---

## 6. Khách Hàng & Công Nợ (`customers`)

| Permission Key | Tên hiển thị | Mô tả chi tiết |
|---|---|---|
| `customers.view` | Xem danh sách khách hàng | Xem thông tin khách hàng và lịch sử chơi |
| `customers.create` | Thêm khách hàng | Tạo mới hồ sơ khách hàng |
| `customers.edit_debt` | Sửa & Thu nợ khách hàng | Ghi nhận trả nợ, thu nợ, chỉnh sửa công nợ |
| `customers.delete` | Xóa khách hàng | Xóa thông tin khách hàng |
| `customers.import_export` | Nhập / Xuất khách hàng | Import / Export danh sách khách qua Excel |
| `customers.groups.view` | Xem nhóm khách hàng | Xem danh sách các nhóm khách (VIP, Thân thiết) |
| `customers.groups.manage` | Quản lý nhóm khách hàng | Tạo, sửa, xóa các nhóm khách hàng |

---

## 7. Quản Trị Quán (`store`)

| Permission Key | Tên hiển thị | Mô tả chi tiết |
|---|---|---|
| `staff.manage` | Quản lý nhân viên | Tạo tài khoản nhân viên, phân quyền, cấp mã PIN |
| `role.manage` | Quản lý vai trò | Tạo và thiết lập quyền hạn các vai trò |
| `report.view` | Xem báo cáo doanh thu | Xem thống kê doanh thu theo ngày, tháng, ca làm việc |
| `store.settings.manage` | Cài đặt cửa hàng | Cấu hình thông tin quán, máy in, bảng giá giờ |
