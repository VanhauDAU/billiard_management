# Tiến độ phát triển

Cập nhật: **2026-08-18**

## Tổng quan

Dự án đã hoàn thành **M0 - Foundation** và **M1.1 - Device identity + Store execution context**. Bước nghiệp vụ tiếp theo là **M1.2 - Employee + PIN/AuthGate**.

Trạng thái hiện tại:

- **M0 Foundation:** ✅ Done.
- **M1.1 Device identity + Store context:** ✅ Done theo gate kỹ thuật/local đã chốt.
- **Post-M1.1 hardening:** ✅ các lỗi trust-boundary chính đã fix; còn một số release/admin debt trước remote/pilot.
- **M1.2 Employee + PIN/AuthGate:** ⏭ Next.
- **Remote/pilot:** chưa deploy; còn auth/permission, nghiệp vụ POS, printing, mobile và offline/sync.

Scope V1 đã khóa: [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md).

## M0 - Foundation

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| pnpm monorepo | ✅ Done | `apps/*`, `packages/*` |
| Desktop Electron scaffold | ✅ Done | React + TypeScript + electron-vite |
| Electron process boundary | ✅ Done | context isolation, sandbox, narrow preload API |
| Typed IPC | ✅ Done | app/backend/device APIs |
| Worker/Hono local | ✅ Done | port 8787 |
| Desktop → Worker HTTP | ✅ Done | Main Process quản lý request |
| D1 database + binding | ✅ Done | `billiards-control-plane`, binding `DB` |
| D1 migration tooling | ✅ Done | Wrangler migrations chạy local được |
| Store-based control-plane schema | ✅ Done | `0001_init_control_plane.sql`, không có branch model |
| Device credential schema | ✅ Done | `0002_add_device_credentials.sql` |
| Global installation invariant | ✅ Done | `0003_enforce_global_device_installation.sql` |
| Worker TypeScript typecheck | ✅ Done | production + test typecheck tách riêng |
| Store Durable Object | ✅ Done | `STORE_DO`, SQLite-backed, một DO / Store |
| Store DO identity guard | ✅ Done | Store identity bất biến |
| Store schema migration runner | ✅ Done | versioned, idempotent, newer-version guard |
| Shared contracts | ✅ Done | health, trusted command boundary, device activation/context |
| Domain package | 🟡 Scaffold | business primitives thêm theo vertical slice |
| CI | ✅ Done | frozen install + contracts/Worker typecheck + Worker tests + Desktop build |
| Remote D1 migration/deploy | ⏸ Deferred | review riêng trước remote/pilot |

## Bằng chứng đóng M0

Foundation đã đạt các gate chính:

1. Store-based D1 migration thay hoàn toàn branch model trước khi có remote production data.
2. `StoreDurableObject` chạy SQLite và giữ Store identity bất biến.
3. Store DO có schema migration/versioning runner và automated tests cho schema guard, identity, read/write, transaction và Store isolation.
4. `@billiards/contracts` là package dùng thật bởi Worker/Desktop.
5. Contracts, Worker production code và Worker tests typecheck độc lập.
6. Root CI bảo vệ Worker tests và Desktop build.

M0 không yêu cầu deploy production hoặc apply D1 remote. Deployment/release có gate riêng khi chuẩn bị remote/pilot.

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

Nguyên tắc:

- V1 không có branch.
- Store là tenant/data-isolation boundary.
- D1 chứa control/auth/device/permission metadata.
- Operational billiards state nằm trong Store DO.
- Mutation nghiệp vụ dùng command semantics.
- Offline local SQLite/outbox đến sau online vertical slice.

Chi tiết: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`ADR-001-single-store-no-branch.md`](ADR-001-single-store-no-branch.md), [`ADR-002-command-trust-boundary.md`](ADR-002-command-trust-boundary.md) và [`ADR-003-device-installation-single-store.md`](ADR-003-device-installation-single-store.md).

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

**Trạng thái: ✅ Done**

Đã triển khai:

- one-time activation token; D1 chỉ lưu SHA-256 token,
- device secret 256-bit; D1 chỉ lưu SHA-256 credential,
- reactivation cùng Store + installation rotate credential và tăng `credential_version`,
- một installation chỉ thuộc tối đa một Store; cross-Store activation fail-closed bằng DB invariant,
- device auth middleware với `Authorization: Device <deviceId>.<deviceSecret>`,
- revoked/inactive device và inactive Store fail-closed,
- Store context resolve server-side từ `devices.store_id`, không tin `x-store-id` từ client,
- `GET /api/pos/context`,
- `/api/system/*` được bảo vệ bằng system diagnostics token riêng và fail-closed khi chưa cấu hình,
- shared Zod contracts cho activation/context,
- client command envelope không chứa Store/Device/Actor authority; server mới enrich trusted context,
- `issuedAt` chỉ là client intent timestamp, không phải authoritative online clock,
- Electron tạo `installationId` ổn định trong `userData`,
- Electron Main lưu device credential bằng async `safeStorage`; renderer không nhận raw secret,
- IPC/preload API hẹp cho `device.getState()` và `device.activate()`,
- DeviceGate có not-activated / reactivation / blocked / unavailable / local-error / ready,
- Electron chỉ trust top-level renderer hợp lệ; packaged renderer trust đúng packaged file,
- renderer permission requests deny-by-default; packaged DevTools tắt,
- packaged Desktop bắt buộc backend HTTPS; HTTP development chỉ cho loopback,
- Electron main bundle `@billiards/contracts` để tránh runtime raw-TS ESM resolution,
- Electron dev/start tự bảo đảm binary Electron 43 đã được tải,
- packaging identity đã đổi khỏi scaffold sang `com.billiards.pos` / `Billiards POS`,
- activation conflict được phân biệt với backend/unavailable error thay vì gom mọi lỗi thành HTTP 409.

Automated test hiện tại:

```text
Store Durable Object tests            9
Device context/activation tests       9
Device authorization parser tests     4
System diagnostics auth tests         3
Cross-Store installation tests        1
Command trust-boundary tests          3
----------------------------------------
Worker tests total                   29
```

Local Worker activation + authenticated `/api/pos/context` đã smoke-test thành công. Device activation screen cũng đã chạy trên Electron. Full packaged Windows/restart smoke vẫn là release/pilot gate, không thay thế bằng typecheck/build.

### Post-M1.1 audit/hardening

Đợt review sau merge đã sửa các nhóm lỗi chính:

- Electron trusted renderer/IPC quá rộng,
- backend transport có thể bị cấu hình HTTP ở packaged app,
- Chromium permission chưa deny-by-default,
- runtime Device contract/parser chưa chặt,
- `safeStorage` key rotation + corrupted local credential recovery,
- malformed installation identity bị generic retry loop,
- Electron 43 lazy binary startup trên fresh clone,
- scaffold packaging identity/update placeholder,
- public unauthenticated `/api/system/*` diagnostics,
- cross-Store reuse của cùng installation,
- client-controlled Store/Device/Actor trong `CommandEnvelope`,
- mọi activation backend error trước đây bị giả thành `409 conflict`.

Còn phải xử lý/chốt trước remote/pilot:

- activation-token issuance API/admin UI; hiện mới có verification/consume flow,
- quy trình quản trị để reset/repair installation identity bị hỏng hoặc chuyển thiết bị sang Store khác,
- `devices.last_seen_at` heartbeat/touch policy,
- align TypeScript version giữa `@billiards/contracts` và Worker/Desktop,
- automated Desktop security/integration tests cho trusted URL, IPC sender, secure storage và DeviceGate state,
- code signing/notarization/update channel,
- full packaged Windows activation/restart/update smoke,
- review remote D1 migrations/secrets trước deploy.

### M1.2 - Employee + PIN authentication

**Trạng thái: ⏭ Next**

Yêu cầu:

- danh sách nhân viên hợp lệ chỉ trong trusted Store của Device,
- PIN 4-6 số,
- PIN không lưu plaintext và không hash bằng SHA-256 thuần,
- PIN credential, rate-limit và lockout thiết kế cùng nhau,
- auth session gắn Store + User + Membership + Device,
- raw session token không lưu trong D1,
- mọi employee request tiếp tục phải đi qua Device context hợp lệ; session token không được bypass revoked Device/Store,
- Desktop AuthGate nằm sau DeviceGate,
- server-side auth là security boundary; UI chỉ phản ánh trạng thái.

### M1.3 - Permission context

- load membership/role,
- resolve capability set từ `role_permissions`,
- enforce ở Worker/server-side,
- role/membership/user status phải được kiểm tra khi authorize,
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

- remote D1/deployment + secret review,
- full Desktop packaged activation/restart smoke,
- signing/notarization/update channel,
- backup/restore checks,
- observability tối thiểu,
- Windows installer/update channel,
- test cửa hàng thật.

## Việc tiếp theo

**M0 đã đóng. M1.1 đã đóng về functional/local gate và trust-boundary hardening chính.** Thứ tự tiếp theo:

1. M1.2 Employee + PIN/AuthGate.
2. M1.3 Permission context.
3. TableType + BilliardTable.
4. Online POS vertical slice đến payment/close bill.
5. Trước remote/pilot: hoàn thiện activation issuance/device recovery, packaged Windows/release gate và remote secrets/migrations.

Không tạo UI nghiệp vụ lớn trước khi Device/Store/Auth/Permission context đủ tin cậy.