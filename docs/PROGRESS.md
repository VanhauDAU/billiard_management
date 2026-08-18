# Tiến độ phát triển

Cập nhật: **2026-08-18**

## Tổng quan

Dự án đã đóng ba lớp nền tảng quan trọng trước khi làm nghiệp vụ POS:

- **M0 Foundation:** ✅ Done.
- **M1.1 Device identity + Store execution context:** ✅ Done.
- **M1.2 Employee PIN authentication + AuthGate:** ✅ Done.
- **Post-M1.2 review/hardening:** ✅ hoàn tất vòng review hiện tại.
- **M1.3 Permission Context:** ⏭ Next.

Scope V1 đã khóa: [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md).  
Kiến trúc: [`ARCHITECTURE.md`](ARCHITECTURE.md).  
Roadmap/gate: [`ROADMAP.md`](ROADMAP.md).

## M0 - Foundation

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| pnpm monorepo | ✅ | `apps/*`, `packages/*` |
| Desktop Electron | ✅ | React + TS + electron-vite |
| Main/Preload/Renderer boundary | ✅ | context isolation, sandbox, narrow preload |
| Worker/Hono | ✅ | Cloudflare Worker, local port 8787 |
| D1 control plane | ✅ | `billiards-control-plane` |
| Store Durable Object | ✅ | SQLite-backed, một DO / Store |
| Store DO schema runner | ✅ | identity/version/migration guards |
| Shared contracts | ✅ | Zod contracts dùng bởi Worker/Desktop |
| Domain package | 🟡 | thêm pure rules theo business vertical slice |
| CI | ✅ | frozen install + typecheck + Worker tests + Desktop build |
| Remote deployment | ⏸ | gate riêng trước pilot |

## M1 - Windows POS online

Vertical slice mục tiêu:

```text
Trusted Device
  ↓
Trusted Employee/AuthSession
  ↓
Permission Context
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
Bàn available
```

### M1.1 - Device identity + Store execution context

**Trạng thái: ✅ Done**

Đã triển khai:

- one-time activation token; raw token không persist,
- Device secret 256-bit; D1 chỉ lưu hash,
- credential rotation khi reactivation,
- global unique `installationId`; cross-Store reuse fail-closed,
- `requireDevice` + trusted `DeviceContext`,
- Store resolve từ D1, không tin client `storeId`,
- protected system diagnostics,
- command envelope không chứa Store/Device/Actor authority,
- Electron stable installation identity,
- Device credential encrypted bằng async `safeStorage`,
- DeviceGate + activation/reactivation/error states,
- packaged backend HTTPS-only,
- renderer isolation/sandbox, IPC sender validation, navigation deny-by-default.

### M1.2 - Employee PIN authentication + AuthGate

**Trạng thái: ✅ Done**

Đã triển khai:

- migration `0004_add_employee_pin_credentials.sql`,
- employee PIN 4-6 số, giữ leading zero,
- PBKDF2-SHA256 + random salt + credential version,
- server-side failure window/lockout theo Store + User + Device,
- random session credential; D1 chỉ lưu session secret hash,
- AuthSession bind Store + User + Membership + Device + PIN credential version,
- session validation re-check Store/Device/User/Membership/Role/PIN status,
- `requireAuthSession` derive trusted actor server-side,
- `/api/auth/employees`, `/pin`, `/session`, `/logout`,
- HTTP không leak employee-existence qua PIN error,
- lockout trả 429 + `Retry-After`,
- Device reactivation revoke session cũ,
- PIN rotation/version change invalidate session cũ,
- Electron Main lưu AuthSession credential bằng async `safeStorage`,
- Renderer không nhận raw `sessionToken` hoặc `deviceSecret`,
- AuthGate: employee picker, PIN keypad, lockout countdown, restore session, logout,
- corrupted local session credential được discard và login lại,
- local manual smoke đã xác nhận login, lockout, restart/restore và logout.

### Post-M1.2 review/hardening

Vòng review sau merge đã chốt/sửa:

- `README`, architecture và progress trước đó vẫn ghi M1.2 là “Next” → đồng bộ lại docs,
- toàn bộ `/api/auth/*` response được đánh `Cache-Control: no-store`,
- thêm regression coverage cho Device reactivation → `device_reactivated` session revocation,
- khóa behavior: replay activation token đã dùng **không** được revoke session mới,
- cập nhật architecture risk/debt theo trạng thái thực tế.

Các điểm review **không sửa vội** vì cần change-set riêng + broader validation:

- TypeScript version đang lệch giữa packages,
- `AuthGate.tsx` lớn và nên tách trước khi UI POS phình ra,
- Desktop chưa có automated Electron integration/security tests,
- lint/format chưa phải root CI gate,
- AuthSession retention/concurrency policy chưa chốt.

## M1.3 - Permission Context

**Trạng thái: ⏭ Next / P0 trước business mutation**

Mục tiêu:

1. Resolve permissions từ `role_permissions` bằng trusted `AuthContext.roleId + storeId`.
2. Tạo `PermissionContext` internal; không nhận permissions từ client.
3. Tạo middleware/helper `requirePermission(permissionKey)`.
4. Re-check current Membership/Role status trong authorize path.
5. Absence of permission = deny.
6. Business handler chỉ dùng Store/Device/Actor từ trusted contexts.
7. UI chỉ hide/disable theo capability; Worker vẫn enforce.
8. Regression tests: cross-Store role spoof, stale role change, missing capability, disabled role/membership.

Gate đóng M1.3:

```text
requireDevice
  → requireAuthSession
  → resolve PermissionContext
  → requirePermission(...)
  → protected test route/command
```

phải được automated-test trước khi tạo mutation nghiệp vụ bàn.

## M1.4 - Table foundation

Sau M1.3:

- Store DO migration cho `table_types` + `billiard_tables`,
- trạng thái bàn tối thiểu `available / occupied / disabled` theo domain design,
- loại bàn/pricing reference là data, không hard-code,
- list/read route theo trusted Store,
- create/update table management cần permission,
- no cross-Store operational access.

## M1.5 - Pricing + Open TableSession

- pricing foundation đủ để mở bàn,
- command/idempotency boundary,
- authoritative server time,
- atomic open-session transition trong Store DO,
- không cho hai active sessions trên cùng bàn,
- price/config snapshot/version để không sửa lịch sử.

## M1.6 - Product + Bill + Payment vertical slice

- Category/Product,
- add item với price snapshot,
- Bill lifecycle,
- payment `cash` / `bank_transfer`,
- finalize bill/session atomically,
- bàn trở về `available`,
- audit/domain events cần thiết.

Khi M1.6 đóng, hệ thống mới có **online POS vertical slice hoàn chỉnh**.

## M2 - Business completeness

- pricing rules linh hoạt đầy đủ,
- time adjustment + permission/reason/audit,
- chuyển bàn,
- gộp bill,
- catalog đầy đủ,
- role/permission management UI,
- audit/domain events hoàn chỉnh hơn.

V1 hiện không có tồn kho, discount/surcharge hoặc split bill.

## M3 - Printing

Scope tại [`PRINTING_V1.md`](PRINTING_V1.md):

- 80mm,
- Windows print adapter/driver/spooler,
- template mặc định,
- allowlisted placeholder/block editor,
- QR thanh toán,
- preview cùng template semantics,
- template versioning,
- retry/idempotency print job.

## M4 - Mobile PWA + realtime

Mobile là operational client theo permission, không fork business rules.

Mục tiêu:

- trạng thái bàn realtime,
- mở bàn,
- add product,
- chuyển/gộp,
- payment,
- invoice/report/management theo permission.

## M5 - Offline/sync/takeover

- Desktop local SQLite replica,
- persistent command outbox,
- sync cursor/protocol,
- conflict/takeover policy,
- clock/boot-anchor handling,
- crash/network recovery.

## M6 - Reports + pilot

Reports V1:

- doanh thu hôm nay/theo ngày,
- tiền bàn/hàng hóa,
- lượt bàn/thời gian sử dụng,
- sản phẩm bán chạy,
- hóa đơn,
- cash/bank-transfer breakdown.

## Risk / technical debt register

### P0 - trước mutation nghiệp vụ

- M1.3 Permission Context.
- Command idempotency semantics cho Store DO mutation.
- Trusted Store/Device/Actor injection vào business command handler.

### P0 - trước remote/pilot

- activation-token issuance/admin UI + permission,
- Device transfer/reset/installation-repair admin flow,
- remote D1 migration/secrets/backup/recovery/observability review,
- signing/notarization/update channel,
- packaged Windows activation/restart/update smoke,
- branch protection `main`: PR-only + required CI status.

### P1

- `devices.last_seen_at` heartbeat policy,
- align TypeScript versions trong monorepo,
- automated Electron security/integration tests,
- normalize lint/format rồi đưa vào CI,
- AuthSession retention/pruning + concurrent-session policy,
- Device-wide PIN abuse budget/throttling nếu threat model mở rộng,
- split `AuthGate.tsx` thành controller/hooks + components,
- Mobile scaffold package naming/toolchain cleanup trước M4.

## CI hiện tại

Root gate:

```bash
pnpm run ci
```

Bao gồm:

```text
contracts typecheck
Worker production typecheck
Worker test typecheck
Worker Vitest
Desktop typecheck + build
```

CI chưa thay thế manual Desktop smoke cho OS secure storage, packaged behavior, printing và updater.

## Việc tiếp theo

**Bắt đầu M1.3 Permission Context.**

Thứ tự đề xuất:

1. permission contracts/catalog typing,
2. permission resolver server-side,
3. `requirePermission`,
4. protected integration route/test,
5. role/membership change invalidation behavior,
6. sau khi gate xanh mới tạo TableType/BilliardTable.

Không tạo UI nghiệp vụ lớn trước khi server-side authorization hoàn chỉnh.
