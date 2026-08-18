# Roadmap triển khai

Cập nhật: **2026-08-19**

Roadmap này dùng để quyết định **thứ tự implementation và gate đóng milestone**. Chi tiết trạng thái đã làm nằm ở [`PROGRESS.md`](PROGRESS.md); invariant kỹ thuật nằm ở [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Nguyên tắc lập kế hoạch

1. Security/trust boundary phải đi trước business mutation.
2. Làm online vertical slice hoàn chỉnh trước offline/sync.
3. Chỉ thêm Store DO schema khi vertical slice thật sự cần.
4. Business state authoritative nằm server-side/Store DO; UI timer/state không phải nguồn sự thật.
5. Mỗi milestone phải có automated regression test và `pnpm run ci` xanh.
6. Remote/pilot là release gate riêng, không đồng nghĩa với feature local đã xong.

## Trạng thái milestone

| Milestone | Mục tiêu | Trạng thái |
|---|---|---|
| M0 | Foundation/monorepo/Worker/D1/Store DO | ✅ Done |
| M1.1 | Device identity + trusted Store | ✅ Done |
| M1.2 | Employee PIN + AuthSession + AuthGate | ✅ Done |
| M1.3 | Permission Context & RBAC | ✅ Done |
| M1.4 | TableType + BilliardTable Foundation | ✅ Done |
| M1.5 | Pricing Foundation + Open TableSession | ⏭ Next |
| M1.6 | Product + Bill + Payment + Finalize | ⬜ Planned |
| M2 | Business Completeness (Chuyển bàn, Gộp bill,...) | ⬜ Planned |
| M3 | Printing 80mm & Template Editor | ⬜ Planned |
| M4 | Mobile PWA + Realtime State | ⬜ Planned |
| M5 | Offline / Sync / Takeover | ⬜ Planned |
| M6 | Reports + Production Pilot | ⬜ Planned |

---

## M1.3 - Permission Context (✅ Done)

- **Mục tiêu:** Từ `AuthContext` đã xác thực, Worker tự động phân giải danh sách quyền (`PermissionContext`) từ `role_permissions` dựa trên `roleId + storeId`.
- **Enforcement:** Middleware `requirePermission(permissionKey)` bảo vệ mọi API nhạy cảm. Thiếu quyền trả về 403 Forbidden.
- **Coverage:** Kiểm thử đầy đủ các trường hợp quyền hợp lệ, thiếu quyền, giả mạo quyền cross-store, tài khoản bị vô hiệu hóa.

---

## M1.4 - Table Foundation (✅ Done)

- **Mục tiêu:** Cung cấp hạ tầng quản lý loại bàn (`table_types`) và danh sách bàn (`billiard_tables`) trong Store DO.
- **Implementation:** Store DO migration 002, Table Command Executor với cơ chế fingerprint và idempotency check, Store DO RPC, REST endpoints `/api/pos/tables`, `/api/pos/table-types`, `/api/pos/table-commands`, Desktop UI quản lý bàn.
- **Coverage:** Kiểm thử schema SQLite trong DO, table commands execution, deduplication và REST API.

---

## M1.5 - Pricing Foundation + Open TableSession (⏭ Next)

### Mục tiêu

Thiết lập cơ chế tính giá giờ chơi và luồng mở bàn (`OpenTableSession`) cho khách hàng.

### Work packages

#### M1.5-A - Pricing Configuration
- Schema cấu hình giá theo loại bàn trong Store DO.
- Hỗ trợ giá cơ bản theo giờ, khung giờ linh hoạt (giờ vàng/giờ thấp điểm), ngày trong tuần.
- Snapshot giá khi mở phiên chơi để đảm bảo thay đổi bảng giá sau này không ảnh hưởng đến phiên đang chạy hoặc lịch sử.

#### M1.5-B - Table Session Schema & Lifecycle
- Bảng `table_sessions` trong Store DO: `id`, `table_id`, `start_time`, `pricing_snapshot`, `status` (`active`, `closed`, `cancelled`), `actor_id`.
- Trạng thái bàn tự động chuyển từ `available` → `playing`.
- Không cho phép mở 2 active sessions trên cùng một bàn.

#### M1.5-C - Open Session Command & Authoritative Time
- Lệnh `OpenTableSession` qua Command Executor.
- Thời gian bắt đầu bàn lấy từ **Server Clock** (Store DO execution time), không dựa vào đồng hồ trên máy client.
- Idempotency policy: lệnh gửi lặp lại với cùng `command_id` không tạo 2 phiên chơi.

#### M1.5-D - Desktop UI Session Workspace
- Giao diện sơ đồ bàn trực quan: hiển thị bàn trống / bàn đang chơi.
- Bảng điều khiển mở bàn nhanh.
- Timer hiển thị thời gian chơi tính toán từ server start time.

### Gate đóng M1.5
- Kiểm thử mở bàn, chặn mở đúp bàn, tính giờ chính xác qua unit/integration tests.
- UI Desktop mở bàn và cập nhật trạng thái bàn mượt mà.
- `pnpm run ci` xanh.

---

## M1.6 - Online POS Vertical Slice (⬜ Planned)

### Mục tiêu

Hoàn thành chu trình phục vụ và thanh toán trọn vẹn tại quầy POS:

```text
Mở bàn → Gọi đồ ăn/uống → Tính tiền giờ + hàng hóa → Thanh toán (Cash/Bank) → Đóng bill & Bàn trống
```

### Work packages
- **Product Catalog:** Quản lý thực đơn, sản phẩm, giá bán, danh mục.
- **Add Product to Session:** Thêm đồ ăn/uống vào bàn với giá snapshot tại thời điểm gọi.
- **Bill Lifecycle:** Tạo hóa đơn tự động gắn với phiên chơi, tính tổng tiền bàn + tiền món.
- **Payment:** Hỗ trợ thanh toán Tiền mặt (Cash) và Chuyển khoản (Bank Transfer với mã QR).
- **Finalize Transaction:** Thực hiện transaction nguyên tử: xác nhận thanh toán + đóng bill + đóng table session + chuyển bàn về `available`.

---

## M2 - Business Completeness (⬜ Planned)

- Chuyển bàn (giữ nguyên thời gian và món ăn).
- Gộp bill / gộp bàn.
- Điều chỉnh thời gian phiên chơi (yêu cầu quyền đặc biệt và ghi nhận audit log rõ ràng).
- Quản lý thực đơn và danh mục toàn diện.
- Báo cáo ca làm việc và tổng kết thu chi hàng ngày.

---

## M3 - In hóa đơn 80mm (⬜ Planned)

- Kết nối máy in nhiệt bill 80mm qua Desktop Main process.
- Mẫu hóa đơn mặc định và trình chỉnh sửa mẫu in (header, footer, lời cảm ơn, QR code thanh toán).
- Chức năng in tạm tính và in hóa đơn thanh toán.
- Idempotency cho các tác vụ in để tránh in lặp.

---

## M4 - Mobile PWA + Realtime (⬜ Planned)

- Giao diện PWA dành cho nhân viên phục vụ tại bàn và chủ quán xem từ xa.
- Kết nối realtime nhận cập nhật trạng thái bàn từ Store DO.
- Dùng chung toàn bộ contracts, business logic và phân quyền từ Worker.

---

## M5 - Offline / Sync (⬜ Planned)

- Local SQLite replica trên Desktop POS.
- Persistent command outbox lưu trữ lệnh khi mất mạng.
- Giao thức đồng bộ hai chiều (sync cursor, conflict resolution) khi kết nối mạng phục hồi.

---

## M6 - Reports & Pilot Launch (⬜ Planned)

- Báo cáo doanh thu chi tiết (theo ngày, theo bàn, theo món, phương thức thanh toán).
- Đóng gói installer Windows chính thức (Code signing, auto-updater).
- Checklist nghiệm thu và triển khai thử nghiệm tại quán thực tế.
