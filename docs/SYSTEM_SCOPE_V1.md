# System Scope V1 - Billiard Management

Cập nhật: **2026-08-18**

Tài liệu này là scope nghiệp vụ V1 đã được duyệt. Nếu code, migration hoặc tài liệu khác mâu thuẫn với tài liệu này thì **SYSTEM_SCOPE_V1.md là nguồn quyết định nghiệp vụ ưu tiên** cho đến khi có quyết định mới.

## 1. Mô hình cửa hàng

### Quyết định đã chốt

- Một `Store` là một cửa hàng billiards tại **một địa điểm vật lý**.
- V1 **không có khái niệm chi nhánh/branch** trong sản phẩm.
- Không có màn hình chọn chi nhánh, chuyển chi nhánh hoặc dữ liệu phân vùng theo branch.
- Nếu sau này cần quản lý chuỗi/nhiều địa điểm, sẽ thiết kế như một capability mới; không giữ branch chỉ để “phòng tương lai”.
- Trong kiến trúc SaaS, `Store` chính là tenant boundary của dữ liệu.

## 2. Người dùng, vai trò và phân quyền

Một cửa hàng có nhiều người dùng/nhân viên.

Hệ thống cung cấp các vai trò mặc định để bắt đầu nhanh:

- Owner / Chủ cửa hàng.
- Manager / Quản lý.
- Cashier / Thu ngân.
- Staff / Nhân viên.

Nhưng **quyền không được hard-code chỉ theo bốn role trên**. Chủ cửa hàng có thể cấu hình linh hoạt:

- tạo/sửa vai trò tùy chỉnh,
- bật/tắt quyền theo vai trò,
- gán vai trò cho nhân viên,
- khóa/mở nhân viên.

Các quyền dự kiến gồm các capability nhỏ như:

- xem bàn,
- mở bàn,
- chuyển bàn,
- thêm/xóa món,
- điều chỉnh thời gian,
- gộp bill,
- thanh toán,
- xem lịch sử hóa đơn,
- quản lý bàn/loại bàn,
- quản lý giá,
- quản lý sản phẩm,
- quản lý nhân viên/quyền,
- xem báo cáo,
- sửa mẫu in,
- sửa cấu hình cửa hàng.

`Owner` là vai trò hệ thống đặc biệt, không được tự xóa mất quyền quản trị cốt lõi của chính cửa hàng.

## 3. Đăng nhập POS

Luồng mục tiêu:

```text
Thiết bị đã được đăng ký cho Store
          ↓
Danh sách nhân viên được phép dùng POS
          ↓
Chọn nhân viên
          ↓
Nhập PIN 4-6 số
          ↓
Xác thực + nạp permission set
          ↓
Vào POS
```

Nguyên tắc:

- Không yêu cầu nhân viên nhập email/password dài mỗi ca thao tác POS.
- PIN không lưu plaintext.
- PIN hashing, pepper, rate limiting và lockout được thiết kế cùng AuthGate.
- Mọi mutation quan trọng phải biết actor/user thực hiện.

## 4. Quản lý bàn và loại bàn

Cửa hàng có thể tự cấu hình loại bàn, **không hard-code danh sách loại bàn**.

Ví dụ loại bàn:

- bàn líp,
- bàn lỗ,
- và các loại khác do chủ cửa hàng tự tạo.

Mỗi bàn có tối thiểu:

- mã/số bàn,
- tên hiển thị,
- loại bàn,
- thứ tự hiển thị,
- trạng thái hoạt động,
- cấu hình giá mặc định hoặc override nếu được bật.

Trạng thái vận hành V1 tối thiểu:

- `available` - trống,
- `playing` - đang chơi,
- `disabled` - tạm khóa/không sử dụng.

Đặt bàn/reservation chưa thuộc scope V1.

## 5. Cấu hình giá linh hoạt

Giá do Owner hoặc người có quyền cấu hình; hệ thống không hard-code một mức giá duy nhất.

V1 phải hỗ trợ nền tảng pricing có thể biểu diễn ít nhất:

- giá cơ bản theo loại bàn,
- khung giờ có giá khác nhau,
- cấu hình theo ngày/nhóm ngày khi cửa hàng cần,
- override giá cho một bàn cụ thể nếu được cấu hình,
- quy tắc làm tròn/tính thời gian được cấu hình rõ.

Khi một phiên chơi đã bắt đầu, dữ liệu cần đủ để tái hiện cách tính tiền tại thời điểm đó; thay đổi bảng giá sau này không được làm sai hóa đơn/phiên lịch sử.

## 6. Mở bàn và tính giờ

Luồng chuẩn:

```text
Bàn trống
  ↓
Mở bàn
  ↓
Tạo TableSession + thời điểm bắt đầu
  ↓
Bàn = playing
  ↓
Tính thời lượng từ dữ liệu thời gian, không dựa vào timer UI
  ↓
Tính tiền bàn theo pricing policy
```

Màn hình cần hiển thị ít nhất:

- thời gian đã chơi,
- tiền bàn hiện tại,
- tiền hàng hóa,
- tổng tạm tính.

## 7. Điều chỉnh thời gian

Có hỗ trợ điều chỉnh thời gian nhưng đây là thao tác có kiểm soát.

Yêu cầu:

- phải có permission,
- phải ghi lý do,
- lưu người thực hiện,
- lưu giá trị trước/sau hoặc delta,
- có audit trail.

Các tình huống có thể gồm thêm/bớt thời gian hoặc sửa mốc bắt đầu theo nghiệp vụ được cho phép.

## 8. Danh mục và sản phẩm

V1 chọn **A - chỉ quản lý sản phẩm và giá bán, chưa quản lý tồn kho**.

Có:

- danh mục,
- sản phẩm,
- giá bán,
- đơn vị tính,
- ảnh tùy chọn,
- trạng thái bán/ngừng bán,
- tìm kiếm/lọc phục vụ POS.

Không có trong V1:

- nhập kho,
- xuất kho,
- tồn kho,
- nhà cung cấp,
- giá vốn/kế toán kho.

## 9. Thêm sản phẩm vào bàn

Trong phiên chơi có thể thêm sản phẩm trực tiếp vào bill/phiên của bàn.

Yêu cầu:

- tăng/giảm số lượng,
- xóa món nếu có quyền,
- ghi chú,
- lưu actor,
- **snapshot giá bán tại thời điểm thêm** để việc đổi giá sản phẩm sau này không sửa lịch sử bill.

## 10. Hóa đơn V1

V1 **chưa cần giảm giá và phụ thu**.

Bill cần có:

- mã hóa đơn dễ đọc,
- bàn/phiên liên quan,
- thời gian bắt đầu/kết thúc,
- tiền bàn,
- bill items,
- tổng tiền,
- trạng thái,
- người tạo/thanh toán,
- lịch sử cần thiết cho audit.

Không thêm discount/surcharge vào V1 chỉ để phòng tương lai.

## 11. Thanh toán

Phương thức V1:

- `cash` - tiền mặt,
- `bank_transfer` - chuyển khoản.

Tiền mặt hỗ trợ:

- tổng cần trả,
- tiền khách đưa,
- tiền thừa.

Chuyển khoản hỗ trợ cấu hình thông tin nhận tiền của cửa hàng và có thể dùng QR trên hóa đơn.

Sau khi thanh toán thành công, bill/session kết thúc theo một transaction nghiệp vụ rõ ràng và bàn trở về trạng thái phù hợp.

## 12. Chuyển bàn, gộp bill, tách bill

Đã chốt:

- **Chuyển bàn: CÓ.**
- **Gộp bill: CÓ.**
- **Tách bill: KHÔNG trong V1.**

Chuyển bàn phải bảo toàn session/bill history và không tạo khoảng thời gian bị tính hai lần.

Gộp bill phải có rule rõ về bill nguồn, bill đích, items, tiền bàn và audit; không được chỉ “copy item rồi xóa bill cũ”.

## 13. In hóa đơn

### Khổ giấy V1

- 80mm.
- Các khổ khác có thể bổ sung sau.

### Template

Hệ thống cung cấp template 80mm mặc định nhưng Owner có thể chỉnh nội dung hiển thị.

Editor sử dụng **template an toàn + placeholder/khối được allowlist**, không cho chạy JavaScript hoặc HTML tùy ý.

Ví dụ placeholder:

```text
{ten_cua_hang}
{dia_chi}
{so_dien_thoai}
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
{qr_thanh_toan}
```

Owner có thể copy placeholder từ danh sách và dán vào editor.

Các danh sách lặp như bill items cần dùng block/template construct riêng, không cố nhét toàn bộ logic vào một token text đơn giản.

### Preview

- Có preview trước khi lưu/in.
- Preview và renderer in phải dùng cùng template semantics để tránh “preview một kiểu, giấy in một kiểu”.
- Template có version; print job/reprint cần biết template version đã dùng hoặc policy reprint được chốt rõ.

### QR thanh toán

`{qr_thanh_toan}` chỉ render khi cửa hàng đã cấu hình dữ liệu chuyển khoản cần thiết. Nếu chưa cấu hình thì template engine phải xử lý trạng thái thiếu dữ liệu rõ ràng, không in QR giả.

## 14. Báo cáo V1

Bắt buộc có:

- doanh thu hôm nay,
- doanh thu theo ngày,
- doanh thu tiền bàn,
- doanh thu hàng hóa,
- số lượt bàn,
- thời gian sử dụng bàn,
- sản phẩm bán chạy,
- danh sách/lịch sử hóa đơn,
- doanh thu theo phương thức tiền mặt/chuyển khoản.

Các báo cáo phải dựa trên dữ liệu nghiệp vụ đã finalized, không tính trực tiếp từ UI state.

## 15. Mobile PWA

Đã chọn **B - thao tác đầy đủ như POS**.

Mobile là client của cùng Store, không phải một branch khác.

Mục tiêu sau khi desktop flow ổn định:

- xem trạng thái bàn realtime,
- mở bàn,
- thêm/xóa sản phẩm theo permission,
- chuyển bàn,
- gộp bill,
- thanh toán tiền mặt/chuyển khoản,
- xem hóa đơn,
- xem báo cáo theo permission,
- quản lý các phần được cấp quyền.

Business rules không được duplicate riêng trong mobile; mobile và desktop dùng cùng contracts/commands/domain rules phía server.

## 16. Chức năng quản trị nền tảng

Platform admin (chủ hệ thống) cần khả năng tối thiểu:

- tạo/kích hoạt Store,
- khóa/mở Store,
- xem trạng thái thiết bị/phiên bản app cần thiết cho hỗ trợ,
- hỗ trợ reset/recovery theo quy trình an toàn,
- xem health/operational metadata cần thiết,
- quản lý entitlement/gói dịch vụ sau này nếu thương mại hóa.

Platform admin không nên trực tiếp sửa bill vận hành của Store như một thao tác thông thường.

## 17. Ngoài scope V1

Chưa làm trong V1 trừ khi có quyết định mới:

- nhiều chi nhánh trong một Store,
- đặt bàn online,
- CRM khách hàng,
- thành viên/tích điểm,
- voucher/khuyến mãi phức tạp,
- discount/surcharge,
- tồn kho/nhập hàng/nhà cung cấp,
- kế toán,
- chấm công/tính lương,
- tách bill,
- AI,
- camera/IoT,
- drag-drop print designer tự do,
- custom HTML/CSS/JavaScript trong mẫu in.

## 18. Vertical slice đầu tiên

Sau khi M0 foundation đóng, vertical slice M1 ưu tiên:

```text
Thiết bị thuộc Store
  ↓
Nhân viên + PIN
  ↓
Permission context
  ↓
Danh sách bàn
  ↓
Mở bàn
  ↓
Tính giờ
  ↓
Thêm sản phẩm
  ↓
Thanh toán cash/bank transfer
  ↓
Đóng bill + bàn trở về available
```

Chuyển bàn, gộp bill, editor mẫu in và báo cáo đầy đủ được triển khai theo milestone sau trong V1, không cần nhồi toàn bộ vào vertical slice đầu tiên.
