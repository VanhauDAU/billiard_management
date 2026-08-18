# Printing System V1 - In Hóa Đơn 80mm

Cập nhật: **2026-08-19**

Tài liệu này xác định kiến trúc, quy trình và yêu cầu kỹ thuật cho hệ thống in hóa đơn nhiệt khổ 80mm trên Desktop POS.

---

## 1. Mục tiêu và Phạm vi (Scope)

- **Khổ in:** Tiêu chuẩn máy in nhiệt 80mm (ESC/POS hoặc qua driver máy in hệ điều hành Windows).
- **Môi trường thực thi:** Main Process của Electron Desktop chịu trách nhiệm kết nối trực tiếp với máy in phần cứng hoặc Windows Print Spooler.
- **Các loại phiếu in:**
  1. **Phiếu tạm tính (Pre-bill):** Dành cho khách kiểm tra giờ chơi và món ăn trước khi thanh toán.
  2. **Hóa đơn thanh toán chính thức (Receipt / Invoice):** In khi thanh toán thành công, có mã tra cứu và mã QR thanh toán ngân hàng (VietQR).

---

## 2. Ranh giới Kiến trúc (Architecture Boundary)

```text
Renderer Process (React UI)
       │ desktopApi.printing.printReceipt(billId, options)
       ▼
Preload Bridge
       │ IPC: PRINTING_PRINT_RECEIPT
       ▼
Main Process (Node.js)
       ├── 1. Lấy dữ liệu Bill & Store qua API Worker (HTTPS)
       ├── 2. Render Template hóa đơn (HTML/Canvas hoặc ESC/POS command stream)
       ├── 3. Tạo mã QR VietQR động (chứa Số tài khoản, Ngân hàng, Số tiền, Nội dung)
       └── 4. Gửi tới máy in qua Windows Print Driver / ESC/POS USB Adapter
```

---

## 3. Cấu trúc Mẫu Hóa Đơn (Receipt Template)

Mẫu hóa đơn 80mm chuẩn bao gồm các khối:

1. **Header (Thông tin quán):**
   - Tên quán billiards (cỡ chữ lớn, đậm).
   - Địa chỉ, Số điện thoại hotline, Wifi password.
   - Tiêu đề: `PHIẾU TẠM TÍNH` hoặc `HÓA ĐƠN THANH TOÁN`.
2. **Metadata (Thông tin phiên):**
   - Số bàn, Loại bàn.
   - Mã hóa đơn, Tên thu ngân / Nhân viên phục vụ.
   - Giờ bắt đầu, Giờ kết thúc, Tổng thời lượng chơi.
3. **Line Items (Bảng chi tiết):**
   - **Tiền giờ:** Thời lượng x Đơn giá giờ = Thành tiền.
   - **Hàng hóa / Dịch vụ:** Tên món, Số lượng, Đơn giá snapshot, Thành tiền.
4. **Totals & Payment:**
   - Tổng tiền giờ, Tổng tiền hàng.
   - Giảm giá / Khuyến mãi (nếu có).
   - **TỔNG CỘNG THANH TOÁN** (In đậm nổi bật).
   - Phương thức thanh toán (Tiền mặt / Chuyển khoản).
5. **VietQR Code (Mã QR thanh toán):**
   - QR code động chuẩn VietQR tạo từ thông tin ngân hàng của quán + số tiền thực tế.
6. **Footer (Lời cảm ơn):**
   - Lời cảm ơn khách hàng, hẹn gặp lại.
   - Ghi chú: "Hóa đơn chỉ có giá trị trong ngày".

---

## 4. Trình chỉnh sửa mẫu in (Template Editor)

- Chủ quán có thể tùy biến mẫu in trên giao diện cài đặt:
  - Bật/tắt hiển thị logo quán.
  - Tùy chỉnh thông điệp Header và Footer.
  - Cấu hình hiển thị mã QR thanh toán.
  - Căn lề và khoảng cách ngắt giấy (Feed lines).

---

## 5. Nguyên tắc an toàn & Idempotency

- Mỗi tác vụ in nhận một `printJobId` duy nhất.
- Ngăn chặn người dùng bấm in liên tục nhiều lần dẫn tới nghẽn lệnh in (spooler jam).
- Xem trước bản in (Print Preview) sử dụng chính xác engine render và font chữ giống như khi xuất ra máy in thực tế.
