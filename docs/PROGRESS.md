# Tiến độ phát triển

Cập nhật: **2026-08-18**

## Tổng quan

Dự án đã đóng bốn lớp nền tảng quan trọng trước khi làm nghiệp vụ POS:

- **M0 Foundation:** ✅ Done.
- **M1.1 Device identity + Store execution context:** ✅ Done.
- **M1.2 Employee PIN authentication + AuthGate:** ✅ Done.
- **Post-M1.2 review/hardening:** ✅ Done.
- **M1.3 Permission Context:** ✅ Done.
- **M1.4 TableType + BilliardTable:** ⏭ Next.

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

**Trạng thái: ✅ Done**

Đã chốt/sửa:

- đồng bộ docs sau M1.2,
- toàn bộ `/api/auth/*` response có `Cache-Control: no-store`,
- regression coverage cho Device reactivation → `device_reactivated` session revocation,
- replay activation token đã dùng không được revoke session mới,
- cập nhật architecture risk/debt theo trạng thái thực tế.

## M1.3 - Permission Context

**Trạng thái: ✅ Done**

Merged qua PR #5 (`feat(auth): complete M1.3 permission context`). Không có D1 migration mới; M1.3 dùng `permission_catalog` + `role_permissions` đã tồn tại trong control plane.

### Contracts

- `PERMISSION_KEYS` là system-controlled allowlist trong `@billiards/contracts`,
- `PermissionKeySchema`/`PermissionContextResponseSchema` strict,
- automated test khóa TypeScript allowlist khớp D1 `permission_catalog`,
- client không thể invent capability key được Worker tin cậy.

### Worker authorization

Đã triển khai:

```text
requireDevice
  ↓
requireAuthSession
  ↓
trusted AuthContext
  ↓
resolvePermissionContext
  ↓
PermissionContext
  ↓
requirePermission(permissionKey)
```

Behavior đã khóa:

- resolver dùng trusted `storeId + membershipId + actorId + current roleId`,
- Membership/Role hiện hành được re-check,
- absence of permission = deny,
- permission key lạ trong DB = fail-closed,
- authenticated actor thiếu capability → `403 permission_denied`,
- actor/auth context không còn hợp lệ → `401`,
- resolver/backend authorization failure → fail-closed,
- permission revocation có hiệu lực ở request kế tiếp,
- role reassignment sau login có hiệu lực ở request kế tiếp,
- cross-Store permission không thể cấp quyền cho Store khác,
- client-supplied role/actor/permission metadata không có tác dụng.

### Auth capability endpoint

Đã có:

```text
GET /api/auth/permissions
```

Endpoint cần Device + AuthSession, trả safe capability snapshot:

```json
{
  "permissions": ["table.view", "table.open"]
}
```

Danh sách này phục vụ UX; không phải authorization authority.

### Desktop bridge

Đã triển khai:

- Main `getAuthPermissions(...)` gắn Device credential + AuthSession credential,
- response được validate bằng shared contract,
- `getDesktopAuthPermissions()` xử lý secure-storage/session/device failure,
- IPC sender được validate,
- Preload expose narrow `auth.getPermissions()`,
- Renderer không nhận `sessionToken`, `deviceSecret` hoặc `X-Auth-Session`,
- `PermissionGate` giữ capability snapshot trong React memory và expose `hasPermission(...)`,
- permission unavailable → fail-closed, không mở workspace nghiệp vụ,
- session invalid → reset về employee authentication,
- device invalid → quay về DeviceGate.

### Automated coverage

Permission suite cover:

- catalog/contract alignment,
- granted permission → pass,
- missing permission → 403,
- permission revocation,
- suspended membership,
- disabled role,
- role reassignment không cần login lại,
- client metadata spoofing,
- cross-Store isolation,
- full Device → AuthSession → Permission middleware chain,
- `/api/auth/permissions` yêu cầu AuthSession và phản ánh permission hiện hành.

PR head CI đã xanh trước merge.

### Debt không chặn M1.4

- Renderer capability snapshot chưa auto-refresh theo timer/realtime; Worker vẫn authorize current permission mỗi request. Khi có role-management/realtime, có thể refresh on focus/403/event.
- `PermissionGate.tsx` formatting lệch style hiện tại; gom vào formatter/refactor change-set sau.
- `AuthGate.tsx` vẫn lớn; nên tách trước khi Renderer POS tăng mạnh.
- Desktop chưa có automated Electron integration/security tests.

## M1.4 - Table foundation

**Trạng thái: ⏭ Next**

Mục tiêu chỉ xây nền cấu hình bàn trong Store DO SQLite:

```text
table_types
billiard_tables
```

Nguyên tắc đã chốt cho bước tiếp theo:

- đây là operational data → **Store DO**, không phải D1,
- Store DO schema hiện mới version 1 foundation; M1.4 tạo migration version 2,
- TableType là configurable data, không hard-code bàn lỗ/bàn líp trong branching,
- table master lifecycle chỉ cần `active/disabled`,
- không persist `occupied` ở table master; từ M1.5 trạng thái đang sử dụng được derive từ active `TableSession`,
- V1 nên khóa một uniqueness rule rõ cho table display name,
- không hard delete entity đã có lịch sử tham chiếu; dùng disable,
- `table.view` bảo vệ read surface,
- `table.manage` bảo vệ create/update/disable,
- Worker authorize trước khi route tới Store DO,
- Store DO vẫn verify persisted Store identity trước operational access.

Gate M1.4:

- migration v1 → v2 + restart compatibility,
- table type/table create/read/update/disable,
- FK/uniqueness constraints,
- Store isolation,
- permission coverage,
- client identity spoofing không có tác dụng,
- Desktop list/management smoke tối thiểu,
- `pnpm run ci` xanh.

**Không làm trong M1.4:** pricing, open table, timer, product, bill, payment, offline.

## M1.5 - Pricing + Open TableSession

- pricing foundation đủ để mở bàn,
- command/idempotency boundary,
- authoritative server time,
- atomic open-session transition trong Store DO,
- không cho hai active sessions trên cùng bàn,
- `available/occupied` derive từ active session,
- price/config snapshot/version để không sửa lịch sử.

## M1.6 - Product + Bill + Payment vertical slice

- Category/Product,
- add item với price snapshot,
- Bill lifecycle,
- payment `cash` / `bank_transfer`,
- finalize bill/session atomically,
- closing active session làm derived table state trở về available,
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

### P0 - trước business mutation

- ✅ M1.3 Permission Context.
- Mọi business route phải lấy Store/Device/Actor từ trusted contexts và gọi `requirePermission` phù hợp.
- Command idempotency bắt buộc trước high-risk operational mutations như OpenTableSession; M1.4 configuration mutation phải có transaction/constraint semantics rõ ràng.

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
- split `AuthGate.tsx`,
- normalize `PermissionGate.tsx` formatting,
- permission UX refresh strategy khi role-management/realtime xuất hiện,
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

**Bắt đầu M1.4 - TableType + BilliardTable.**

Thứ tự đề xuất:

1. khóa domain/schema decisions cho table type/table,
2. Store DO migration v2,
3. shared contracts,
4. Store DO repository/service,
5. Worker `table.view` / `table.manage` routes,
6. migration + Store isolation + permission tests,
7. Desktop list/management smoke tối thiểu,
8. CI + docs rồi mới sang M1.5.

Không bắt đầu OpenTableSession/timer trước khi M1.4 table foundation đóng.