# Printing V1 - 80mm Receipt Templates

Cập nhật: **2026-08-18**

> Trạng thái triển khai: **scope đã khóa, chưa bắt đầu implementation**. M0 Foundation đã hoàn thành; printing dự kiến triển khai ở milestone sau khi online POS flow/bill/payment ổn định.

## 1. Scope

V1 hỗ trợ in hóa đơn khổ **80mm** trên Windows POS.

Các khổ khác có thể thêm sau. V1 không mở rộng thành engine nhiều khổ hoặc designer tự do nếu chưa có requirement mới.

## 2. Điều kiện trước khi triển khai printing

Printing phụ thuộc vào các nghiệp vụ đã ổn định:

- finalized bill model,
- payment result,
- Store information,
- employee/actor context,
- Desktop main-process printing adapter,
- shared receipt/template semantics.

Không xây print renderer dựa trên UI state tạm thời của POS.

## 3. Mục tiêu editor

Owner có thể:

- chọn template 80mm mặc định,
- sửa nội dung text,
- bật/tắt các vùng hiển thị,
- chèn placeholder từ danh sách,
- xem preview,
- lưu phiên bản template.

Ví dụ thao tác:

```text
Danh sách placeholder

{ten_cua_hang}
{so_hoa_don}
{ten_ban}
{qr_thanh_toan}
...

Owner copy {qr_thanh_toan}
        ↓
dán vào editor
        ↓
Preview render QR thật nếu Store đã cấu hình chuyển khoản
```

## 4. Không dùng arbitrary HTML/JS

V1 không cho người dùng chạy:

- JavaScript,
- script tag,
- arbitrary HTML,
- arbitrary CSS,
- external iframe/resource tùy ý.

Template phải dùng DSL/structured editor/allowlisted rich-text semantics do hệ thống kiểm soát.

Lý do:

- bảo mật,
- render ổn định trên máy in nhiệt,
- preview và print nhất quán,
- dễ validate template,
- dễ migrate template version sau này.

## 5. Placeholder V1 dự kiến

### Store

```text
{ten_cua_hang}
{dia_chi}
{so_dien_thoai}
```

### Bill

```text
{so_hoa_don}
{ten_ban}
{gio_vao}
{gio_ra}
{thoi_luong}
{tong_tien_ban}
{tong_hang_hoa}
{tong_thanh_toan}
{phuong_thuc_thanh_toan}
{nhan_vien}
{ngay_gio_thanh_toan}
```

### Payment

```text
{qr_thanh_toan}
{tien_khach_dua}
{tien_thua}
```

Placeholder không hợp lệ phải được editor cảnh báo trước khi lưu.

## 6. Repeating content

Bill items không nên biểu diễn bằng một placeholder text đơn như `{danh_sach_mon}` nếu cần layout linh hoạt.

Nên dùng block có cấu trúc, ví dụ semantic concept:

```text
[items]
  {ten_san_pham} | {so_luong} | {don_gia} | {thanh_tien}
[/items]
```

Syntax cuối cùng chưa khóa; điều bắt buộc là parser/renderer phải do hệ thống kiểm soát và validate được.

## 7. QR thanh toán

`{qr_thanh_toan}` render QR dựa trên cấu hình bank-transfer của Store.

Nếu dữ liệu chưa đủ:

- preview phải hiển thị trạng thái thiếu cấu hình,
- không sinh QR giả,
- không silently render QR sai.

QR là presentation của `bank_transfer`, không phải payment method riêng.

## 8. Preview

Preview và print phải dùng cùng template AST/renderer semantics.

Không duy trì hai renderer có business interpretation khác nhau.

Preview cần mô phỏng:

- chiều rộng 80mm,
- font scale hợp lý,
- alignment,
- separator,
- QR size,
- item wrapping.

## 9. Versioning

Mỗi lần publish template mới tạo version mới thay vì overwrite mất lịch sử.

Dự kiến entity:

```text
print_templates
print_template_versions
print_jobs
```

Print job nên biết template version được dùng để hỗ trợ audit/retry/reprint policy.

Các entity này thuộc operational Store data plane và sẽ được thêm bằng Store DO schema migration khi milestone printing bắt đầu; không đưa sớm vào foundation migration chỉ để dự phòng.

## 10. Printing boundary

```text
Renderer UI
   ↓ typed IPC
Desktop Main Process
   ↓
Print service / adapter
   ↓
Windows driver / spooler
   ↓
80mm thermal printer
```

Renderer không gọi OS printing API trực tiếp.

Business data để render receipt phải đến từ finalized domain state/contract, không từ DOM hoặc component state tùy ý.

## 11. Retry / idempotency

Print request phải có identity riêng để tránh double-print ngoài ý muốn khi network/UI retry.

Cần phân biệt:

- job chưa gửi printer,
- đã gửi spooler,
- success theo mức thông tin OS cho phép,
- failed/retry,
- manual reprint.

Reprint phải có policy rõ về việc dùng template version lịch sử hay template hiện tại.

## 12. Quan hệ với M1/M2

Printing không chặn việc bắt đầu M1.

Thứ tự mong muốn:

```text
Device/Auth/Permission
      ↓
Table/Session/Product/Bill
      ↓
Payment finalize
      ↓
Receipt data contract ổn định
      ↓
Printing 80mm
```

Việc này tránh khóa print template vào một bill schema còn đang thay đổi.

## 13. Ngoài scope V1

- drag-drop designer tự do,
- custom HTML/CSS/JS,
- template marketplace,
- nhiều khổ giấy đồng thời,
- browser-print làm primary Windows POS path.