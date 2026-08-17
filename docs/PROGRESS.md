# Tiến độ phát triển

Cập nhật: **2026-08-18**

## Tổng quan

Dự án đang ở **M0 - Foundation**.

Ngày 2026-08-18 đã chốt lại scope V1: **một Store = một cửa hàng vật lý; V1 không quản lý branch/chi nhánh**. Quyết định này đơn giản hóa domain nhưng làm cho migration control-plane hiện tại cần refactor trước khi tiếp tục.

Ước lượng hiện tại:

- **M0 Foundation:** khoảng **65%** sau khi tính lại theo kiến trúc Store mới.
- **M1 Windows POS online:** chưa bắt đầu nghiệp vụ thật.
- **Toàn bộ MVP đến pilot:** khoảng **10-15%** theo khối lượng.

Tỷ lệ chỉ là chỉ báo kỹ thuật, không phải cam kết thời gian.

Scope V1 đã khóa: [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md).

## M0 - Foundation

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| pnpm monorepo | ✅ Done | `apps/*`, `packages/*` |
| Desktop Electron scaffold | ✅ Done | React + TypeScript + electron-vite |
| Electron security boundary | ✅ Done | context isolation, sandbox, narrow preload API |
| Typed IPC | ✅ Done | app version + backend health |
| Worker/Hono local | ✅ Done | port 8787 |
| Desktop → Worker HTTP | ✅ Done | main process quản lý request |
| D1 database + binding | ✅ Done | `billiards-control-plane`, binding `DB` |
| D1 migration tooling | ✅ Done | Wrangler migrations chạy local được |
| Branch-based migration 0001 | 🔴 Obsolete | đã test local nhưng không còn đúng domain mới |
| Store-based control-plane schema | ⬜ Next | bỏ branch/branch_id/branch_registry |
| Worker → D1 health query | ✅ Done | `/api/system/db-health` |
| Worker TypeScript typecheck | ✅ Done | local `typescript` + `cf-typegen` |
| Shared contracts | 🟡 Scaffold | package tồn tại nhưng chưa có contract thật |
| Domain package | 🟡 Scaffold | package tồn tại nhưng chưa có primitive nghiệp vụ |
| Store Durable Object | ⬜ Pending | thay cho Branch DO |
| Store DO SQLite smoke test | ⬜ Pending | read/write + transaction |
| CI | ⬜ Pending | typecheck/build trên push/PR |
| Remote D1 migration | ⛔ Blocked | không chạy trước khi schema Store mới được review |

## Quyết định domain mới

Đã chốt:

- V1 không có branch.
- Store là tenant/data isolation boundary.
- Loại bàn do Owner tự cấu hình: bàn líp, bàn lỗ, ... không hard-code enum.
- Pricing do Owner cấu hình linh hoạt.
- Có nhiều nhân viên, role/permission cấu hình được.
- POS login bằng nhân viên + PIN.
- Có điều chỉnh thời gian kèm permission/reason/audit.
- Sản phẩm V1 không có tồn kho.
- Bill V1 chưa có discount/surcharge.
- Payment V1: cash + bank transfer.
- Có chuyển bàn.
- Có gộp bill.
- Không có tách bill V1.
- In hóa đơn 80mm, template có placeholder/block editor + preview.
- Mobile PWA sau này thao tác đầy đủ như POS theo permission.

Chi tiết: [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md).

## Migration 0001 - trạng thái mới

Migration hiện tại vẫn chứa:

- `branches`,
- `branch_id`,
- `branch_registry`,
- composite foreign keys phục vụ branch consistency.

Các phần này **không còn phù hợp** với scope đã khóa.

Vì migration chưa được apply remote, bước tiếp theo là **rewrite `0001_init_control_plane.sql` ngay tại foundation**, không tạo migration 0002 chỉ để xóa thiết kế chưa từng lên remote.

Target control-plane mới dự kiến:

```text
stores
users
store_memberships
roles
role_permissions
devices
auth_sessions
store_registry
```

Sau khi rewrite phải:

1. reset local D1 state,
2. apply `0001` từ đầu,
3. chạy `PRAGMA foreign_key_check`,
4. test Store isolation/auth invariants,
5. test `/api/system/db-health`,
6. typecheck Worker,
7. chỉ khi review pass mới cân nhắc remote.

## Gate để đóng M0

M0 chỉ hoàn thành khi:

- clone/install sạch,
- desktop typecheck/build pass,
- worker typecheck pass,
- Worker health pass,
- D1 Store-based migration local pass,
- D1 health pass,
- Store DO health pass,
- Store DO SQLite read/write + transaction smoke test pass,
- shared contract đầu tiên tồn tại thật,
- CI chạy tối thiểu desktop typecheck/build + worker typecheck.

## M1 - Windows POS online

Vertical slice đầu tiên:

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
Đóng bill/session
```

M1 phải dùng command semantics ngay từ đầu dù offline outbox chưa triển khai.

## M2 - Business completeness

Dự kiến hoàn thiện các nghiệp vụ V1 còn lại:

- table types cấu hình,
- pricing rules linh hoạt,
- time adjustments + audit,
- chuyển bàn,
- gộp bill,
- catalog/danh mục đầy đủ,
- bill lifecycle đầy đủ,
- role/permission management,
- domain events/audit cần thiết.

Không có tồn kho, discount/surcharge hoặc split bill trong V1 hiện tại.

## M3 - Printing

V1 printing scope:

- 80mm,
- Windows print agent/driver/spooler,
- template mặc định,
- Owner chỉnh nội dung qua allowlisted placeholder/block editor,
- `{qr_thanh_toan}` và các placeholder dữ liệu,
- preview dùng cùng template semantics với print,
- template versioning,
- retry/idempotency cho print job.

Không có arbitrary HTML/CSS/JavaScript hoặc drag-drop designer tự do trong V1.

## M4 - Mobile PWA + realtime

Mobile đã được chốt là **full operational client theo permission**, không chỉ viewer.

Mục tiêu:

- trạng thái bàn realtime,
- mở bàn,
- thêm sản phẩm,
- chuyển bàn,
- gộp bill,
- thanh toán,
- xem hóa đơn,
- xem báo cáo/quản lý theo permission.

Mobile dùng cùng contracts/commands/server business rules, không fork logic riêng.

## M5 - Offline/sync/takeover

- Desktop local SQLite replica.
- Persistent command outbox.
- Sync cursor/protocol.
- Conflict/takeover policy.
- Clock/boot-anchor handling.
- Recovery sau crash/network loss.

## M6 - Reports + pilot

Báo cáo bắt buộc V1:

- doanh thu hôm nay,
- doanh thu theo ngày,
- doanh thu tiền bàn,
- doanh thu hàng hóa,
- số lượt bàn,
- thời gian sử dụng bàn,
- sản phẩm bán chạy,
- hóa đơn,
- cash/bank-transfer breakdown.

Pilot còn cần:

- backup/restore checks,
- observability tối thiểu,
- Windows installer/update channel,
- test cửa hàng thật.

## Việc tiếp theo

Thứ tự mới:

1. Rewrite migration `0001` theo Store model, loại bỏ branch hoàn toàn.
2. Reset và test D1 local lại.
3. Tạo Store Durable Object spike.
4. Tạo shared health/command contracts đầu tiên.
5. Thêm CI.
6. Đóng M0.
7. Bắt đầu M1 vertical slice.
