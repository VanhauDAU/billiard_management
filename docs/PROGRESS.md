# Tiến độ phát triển

Cập nhật: **2026-08-18**

## Tổng quan

Dự án đã hoàn thành **M0 - Foundation** và bắt đầu **M1 - Windows POS online**.

Trạng thái hiện tại:

- **M0 Foundation:** **100% theo gate kỹ thuật đã chốt**.
- **M1 Windows POS online:** bắt đầu vertical slice đầu tiên.
- **MVP đến pilot:** còn phần lớn nghiệp vụ, printing, mobile và offline/sync.

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
| Store-based control-plane schema | ✅ Done | `0001_init_control_plane.sql`, không còn branch model |
| Worker → D1 health query | ✅ Done | `/api/system/db-health` |
| Worker TypeScript typecheck | ✅ Done | production + test typecheck tách riêng |
| Store Durable Object | ✅ Done | `STORE_DO`, SQLite-backed, một DO / Store |
| Store DO health | ✅ Done | route qua Store ID + identity guard |
| Store DO SQLite smoke tests | ✅ Done | read/write, transaction commit/rollback, Store isolation |
| Store schema migration runner | ✅ Done | versioned, idempotent, reject unsupported newer schema |
| Shared contracts | ✅ Done | API health + `CommandEnvelope` |
| Domain package | 🟡 Scaffold | bắt đầu có business primitives từ M1 |
| CI | ✅ Done | frozen install + contracts/Worker typecheck + Worker tests + Desktop build |
| Remote D1 migration/deploy | ⏸ Deferred | không phải gate M0; thực hiện khi chuẩn bị remote/pilot |

## Bằng chứng đóng M0

Foundation đã đạt các gate chính:

1. Store-based D1 migration thay hoàn toàn branch model trước khi có remote production data.
2. `StoreDurableObject` chạy SQLite và giữ Store identity bất biến.
3. Automated tests bao phủ 9 nhóm kiểm tra: schema version, migration idempotency/newer-version guard, identity, read/write, commit, rollback, isolation và identity lock.
4. Shared `@billiards/contracts` không còn là scaffold rỗng; Worker đã import contract thật.
5. Contracts, Worker production code và Worker tests đều typecheck độc lập.
6. GitHub Actions CI chạy trên push/PR và đã xanh sau khi thêm monorepo quality gate.
7. Desktop build vẫn nằm trong CI gate nên foundation backend không được phép làm hỏng Electron app.

M0 không yêu cầu deploy production hoặc apply D1 remote. Deployment/release sẽ có gate riêng khi bước vào môi trường remote/pilot.

## Kiến trúc foundation đã chốt

```text
Desktop / Mobile
       │
       ▼
Cloudflare Worker / Hono
       │
       ├──────────────► D1 Control Plane
       │                Store/User/Role/Device/Auth
       │
       └──────────────► Store Durable Object
                        one SQLite DB / Store
                        operational single writer
```

Các nguyên tắc foundation:

- V1 không có branch.
- Store là tenant/data-isolation boundary.
- D1 chứa control/auth/device/permission metadata.
- Operational billiards state nằm trong Store DO.
- Mọi mutation nghiệp vụ M1 dùng command semantics.
- Offline local SQLite/outbox đến sau online vertical slice.

Chi tiết: [`ARCHITECTURE.md`](ARCHITECTURE.md) và [`ADR-001-single-store-no-branch.md`](ADR-001-single-store-no-branch.md).

## M1 - Windows POS online

Vertical slice mục tiêu:

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
  ↓
Bàn trở về available
```

### M1.1 - Device identity + Store execution context

Đây là bước code tiếp theo.

Mục tiêu:

```text
Desktop request
   │
   │ device identity
   ▼
Worker
   │
   ├── tra D1 `devices`
   ├── xác định device còn active hay không
   ├── lấy Store đáng tin cậy từ server-side data
   └── tạo request execution context
           │
           ▼
      StoreDurableObject
```

Guardrail:

- Client không được tự khai `storeId` rồi mặc nhiên được tin cậy cho mutation.
- Device phải thuộc Store và ở trạng thái hợp lệ.
- Store context được resolve ở Worker trước khi route tới Store DO.
- Context này sẽ là nền cho Employee + PIN và permission enforcement ở bước sau.

### M1.2 - Employee + PIN authentication

Sau Device context:

- danh sách nhân viên hợp lệ của Store,
- PIN 4-6 số,
- PIN không lưu plaintext,
- credential/AuthGate/rate-limit/lockout thiết kế cùng nhau,
- auth session gắn Store + User + Membership + Device,
- raw session token không được lưu.

### M1.3 - Permission context

- load membership/role,
- resolve capability set từ `role_permissions`,
- enforce ở Worker/server-side,
- UI chỉ phản ánh capability chứ không phải security boundary.

### M1.4+ - POS business slice

Sau khi trust/auth/permission context ổn định mới đi tiếp:

1. TableType.
2. BilliardTable.
3. Pricing foundation cần cho open session.
4. Open TableSession.
5. Timer/server-time semantics.
6. Category/Product.
7. Add product to bill với price snapshot.
8. Bill lifecycle.
9. Cash / bank-transfer payment.
10. Finalize session/bill và trả bàn về `available`.

## M2 - Business completeness

Dự kiến hoàn thiện các nghiệp vụ V1 còn lại:

- pricing rules linh hoạt đầy đủ,
- time adjustments + audit,
- chuyển bàn,
- gộp bill,
- catalog/danh mục đầy đủ,
- bill lifecycle đầy đủ,
- role/permission management UI,
- domain events/audit cần thiết.

Không có tồn kho, discount/surcharge hoặc split bill trong V1 hiện tại.

## M3 - Printing

V1 printing scope đã khóa tại [`PRINTING_V1.md`](PRINTING_V1.md):

- 80mm,
- Windows print adapter/driver/spooler,
- template mặc định,
- Owner chỉnh nội dung qua allowlisted placeholder/block editor,
- `{qr_thanh_toan}` và các placeholder dữ liệu,
- preview dùng cùng template semantics với print,
- template versioning,
- retry/idempotency cho print job.

Không có arbitrary HTML/CSS/JavaScript hoặc drag-drop designer tự do trong V1.

## M4 - Mobile PWA + realtime

Mobile là **full operational client theo permission**, không chỉ viewer.

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

- remote D1/deployment review,
- backup/restore checks,
- observability tối thiểu,
- Windows installer/update channel,
- test cửa hàng thật.

## Việc tiếp theo

**M0 đã đóng.** Thứ tự triển khai tiếp theo:

1. M1.1 Device identity + Store execution context.
2. M1.2 Employee + PIN/AuthGate.
3. M1.3 Permission context.
4. TableType + BilliardTable.
5. Online POS business vertical slice đến payment/close bill.

Không tạo UI nghiệp vụ lớn trước khi Device/Store/Auth/Permission context đủ tin cậy.