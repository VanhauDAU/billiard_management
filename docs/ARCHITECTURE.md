# Kiến trúc hệ thống

Cập nhật: **2026-08-18**

> V1 không có mô hình `branch`. Một `Store` là một cửa hàng billiards tại một địa điểm vật lý và đồng thời là tenant/data-isolation boundary.

Scope nghiệp vụ: [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md).

Quyết định kiến trúc:

- [`ADR-001-single-store-no-branch.md`](ADR-001-single-store-no-branch.md)
- [`ADR-002-command-trust-boundary.md`](ADR-002-command-trust-boundary.md)
- [`ADR-003-device-installation-single-store.md`](ADR-003-device-installation-single-store.md)

## 1. Trạng thái hiện tại

**M0 - Foundation**, **M1.1 - Device identity + Store execution context** và **M1.2 - Employee PIN authentication + AuthGate** đã hoàn thành theo local/functional gate.

Hiện có:

- Electron Desktop main/preload/renderer trust boundary.
- Hono Worker gateway/API.
- D1 Store-based control plane.
- `STORE_DO` + SQLite-backed `StoreDurableObject`, một DO / Store.
- Store identity guard + Store DO migration/version runner.
- one-time Device activation + hashed Device credential.
- một `installationId` chỉ thuộc tối đa một Store tại một thời điểm.
- trusted Store context resolve server-side từ authenticated Device.
- employee PIN credential dùng PBKDF2-SHA256 + server-side lockout.
- AuthSession bind Store + User + Membership + Device + PIN credential version.
- trusted `AuthContext` resolve server-side; raw session credential không vào Renderer.
- Desktop AuthGate sau DeviceGate.
- protected `/api/system/*` diagnostics bằng secret riêng.
- client command envelope không được tự khai Store/Device/Actor identity authority.
- root CI cho contracts/Worker/tests/Desktop build.

Bước tiếp theo: **M1.3 - Permission Context**.

## 2. Sơ đồ tổng thể

```text
┌─────────────────────────┐          ┌─────────────────────────┐
│ Windows Desktop POS     │          │ Mobile PWA              │
│ Electron + React + TS   │          │ React + Vite            │
└────────────┬────────────┘          └────────────┬────────────┘
             │                                     │
             └──────────────────┬──────────────────┘
                                ▼
                     ┌──────────────────────┐
                     │ Cloudflare Worker    │
                     │ Hono gateway/API     │
                     └──────────┬───────────┘
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
       ┌────────────────────┐       ┌────────────────────────┐
       │ D1 Control Plane   │       │ Store Durable Object   │
       │ store/user/role    │       │ one object / Store     │
       │ device/auth/perm   │       │ SQLite operational DB  │
       └────────────────────┘       └───────────┬────────────┘
                                               │
                                               ▼
                                  table/session/product/bill/
                                  payment/command/event/print
```

Cloudflare SQLite-backed Durable Object storage là operational boundary phù hợp vì storage của mỗi object là private, transactional và strongly consistent. D1 giữ control-plane data; D1 `batch()` thực thi statements tuần tự và rollback cả sequence khi statement fail. Điều này phù hợp với các control-plane transition như Device activation/credential rotation nhưng không thay thế Store DO cho high-churn operational state.

V1 không chứa `branches`, `branch_id`, `BRANCH_DO`, `BranchDurableObject` hoặc UI chọn/chuyển branch.

## 3. Store là tenant boundary

Một Store = một cửa hàng vật lý.

Guardrail:

- dữ liệu Store A không được đọc/ghi sang Store B,
- client-supplied `storeId` không phải security authority,
- mọi Store-scoped entity từ payload phải được kiểm tra thuộc trusted Store trước mutation,
- Device context phải được xác thực trước Employee/Auth/Permission context,
- nếu sau này hỗ trợ chuỗi nhiều địa điểm, đó là capability mới chứ không phải branch ẩn trong V1.

## 4. Desktop process boundary

```text
Renderer (React)
      │ window.desktopApi
      ▼
Preload
      │ narrow typed IPC
      ▼
Main Process
      ├── backend HTTP
      ├── installation identity
      ├── encrypted Device credential
      ├── encrypted AuthSession credential
      ├── future local SQLite/sync
      ├── printing
      └── updater
```

Security rules:

- `contextIsolation: true`, `nodeIntegration: false`, renderer sandbox bật.
- Renderer không nhận `deviceSecret` hoặc raw `sessionToken`.
- Preload expose method hẹp theo IPC channel, không expose raw `ipcRenderer`.
- Privileged IPC chỉ chấp nhận top-level trusted renderer frame.
- Development renderer trust theo Vite origin.
- Packaged renderer trust đúng packaged `renderer/index.html`, không phải mọi `file:` URL.
- Chromium permissions deny-by-default.
- DevTools chỉ bật ở development.
- External navigation deny-by-default; chỉ HTTPS origin được allowlist rõ ràng mới được mở.
- Packaged Desktop chỉ kết nối backend qua HTTPS; HTTP development chỉ cho loopback.

Các rule này phù hợp với Electron security guidance hiện hành: context isolation, process sandboxing, restrictive navigation/window creation, sender validation và narrow contextBridge APIs.

### Local credential files

```text
app.getPath('userData')/
├── device/
│   ├── installation.json
│   └── credential.bin
└── auth/
    └── session.bin
```

- `installation.json`: UUID ổn định, không phải secret.
- `device/credential.bin`: encrypted `deviceId + deviceSecret` bằng async `safeStorage`.
- `auth/session.bin`: encrypted `deviceId + sessionToken` bằng async `safeStorage`.
- async `safeStorage` được dùng để hỗ trợ non-blocking operation, key rotation và temporary unavailability handling.
- Device credential hỏng → controlled reactivation.
- Auth session credential hỏng → xóa local credential và yêu cầu PIN login lại.
- secure storage unavailable → fail-closed.
- Device reactivation → xóa local AuthSession credential.

## 5. D1 Control Plane

Migrations hiện tại:

```text
0001_init_control_plane.sql
0002_add_device_credentials.sql
0003_enforce_global_device_installation.sql
0004_add_employee_pin_credentials.sql
```

Các bảng chính:

```text
stores
users
roles
permission_catalog
role_permissions
store_memberships
devices
device_activation_tokens
employee_pin_credentials
employee_pin_auth_state
auth_sessions
store_registry
```

### Device invariant

`0003` tạo global unique index trên `devices.installation_id`.

V1 behavior:

- same Store + same installation → reactivation hợp lệ, giữ Device row và rotate credential,
- different Store + same installation → conflict,
- original Store/device không bị chuyển hoặc revoke ngầm,
- chuyển Store sau này phải là privileged transfer/recovery flow.

### Activation token + AuthSession revocation

`device_activation_tokens` chỉ lưu token hash, Store, status, expiry và used-device metadata. Raw token không persist.

Khi Device reactivation hợp lệ:

1. upsert/rotate Device credential,
2. revoke active AuthSessions đang bind Device đó với reason `device_reactivated`,
3. consume activation token.

Ba statement chạy trong một D1 batch transaction. Replay/expired token không được phép revoke session hiện hành. Regression test phải khóa invariant này.

Issuance/admin UI cho activation token chưa triển khai.

## 6. Device + Store trust boundary

```text
Desktop Main
      │ Authorization: Device <id>.<secret>
      ▼
requireDevice
      ├── validate auth scheme / UUID / secret format
      ├── SHA-256 secret + constant-time compare
      ├── lookup D1 Device + Store
      ├── reject invalid/revoked/inactive states
      └── build trusted DeviceContext
              │
              ▼
         trusted Store
```

`GET /api/pos/context` hiện là Device context/smoke endpoint, chưa phải business POS authorization surface.

Client `x-store-id` hoặc body `storeId` không thay đổi trusted Store context.

## 7. Employee PIN + AuthSession boundary

### PIN credential

PIN V1:

- chuỗi 4-6 chữ số,
- không trim làm mất semantics của leading zero,
- salt random 16 bytes,
- PBKDF2-HMAC-SHA256,
- production iteration config hiện tại: 600,000,
- D1 lưu hash + salt + algorithm + iterations + credential version,
- không lưu raw PIN.

### Lockout

`employee_pin_auth_state` scope:

```text
Store + User + Device
```

Failure window: 15 phút.

Escalation hiện tại:

```text
attempt 1-4   no lock
attempt 5     30 seconds
attempt 6     1 minute
attempt 7     5 minutes
attempt 8     15 minutes
attempt 9+    30 minutes
```

Lockout là server-side security state; countdown trong AuthGate chỉ là UX.

### AuthSession

Login thành công tạo:

```text
sessionId       public UUID
sessionSecret   random 256-bit secret
sessionToken    <sessionId>.<sessionSecret>
```

D1 chỉ persist SHA-256 của high-entropy session secret.

Session bind:

```text
Store
+ User
+ Membership
+ Device
+ PIN credential version
```

Khi authenticate session, Worker re-check:

- Store active,
- Device active,
- User active,
- Membership active,
- Role active,
- PIN credential active,
- PIN credential version vẫn khớp,
- session chưa revoke và chưa expire,
- session secret hash match.

`requireAuthSession` sau đó tạo `AuthContext` từ DB; client không tự khai actor authority.

### Auth API

```text
GET  /api/auth/employees   Device required
POST /api/auth/pin         Device required
GET  /api/auth/session     Device + AuthSession required
POST /api/auth/logout      Device + AuthSession required
```

Toàn bộ `/api/auth/*` response có `Cache-Control: no-store`; `/pin` là endpoint duy nhất trả raw session token và Desktop Main phải consume/lưu credential đó.

## 8. Permission boundary - M1.3 target

M1.3 không được chỉ “load role vào UI”. Permission phải resolve/enforce ở Worker.

Target flow:

```text
requireDevice
      ↓
requireAuthSession
      ↓
Trusted AuthContext
      ↓
resolve role_permissions for trusted Store + Role
      ↓
PermissionContext
      ↓
requirePermission('table.open')
      ↓
business handler
```

Recommended internal shape:

```ts
{
  storeId,
  deviceId,
  actorId,
  membershipId,
  roleId,
  permissions: Set<PermissionKey>
}
```

Rules:

- permission key phải nằm trong `permission_catalog`,
- absence = deny,
- không nhận permission list từ client,
- authorize phải dùng role/membership hiện hành; role change phải có hiệu lực cho request sau,
- UI có thể hide/disable action nhưng Worker vẫn enforce,
- business command handler phải lấy Store/Device/Actor từ trusted context.

Permission catalog hiện đã có các capability như `table.view`, `table.open`, `table.transfer`, `table.manage`, `product.*`, `pricing.manage`, `bill.*`, `employee.manage`, `role.manage`, `report.view`, `print.template.manage`, `store.settings.manage`.

## 9. System diagnostics boundary

```text
/api/system/db-health
/api/system/stores/:storeId/do-health
```

Đây không phải POS business API.

- Nếu `SYSTEM_DIAGNOSTICS_TOKEN` chưa cấu hình đủ mạnh → route trả 404 fail-closed.
- Khi bật → yêu cầu `Authorization: Bearer <system-token>`.
- Secret local đặt trong ignored `.dev.vars`; remote phải dùng deployment secret/config.

Diagnostic path `storeId` không phải precedent cho business mutation routing.

## 10. Store Durable Object

```text
trusted storeId
      ↓
STORE_DO.idFromName(storeId)
      ↓
StoreDurableObject
      ↓
SQLite operational DB
```

Foundation hiện có:

- persisted `store_id`,
- Store identity mismatch guard,
- `system_metadata`,
- schema migration runner,
- migration sequence validation,
- future/newer schema guard,
- migration transaction,
- current Store schema version 1 foundation,
- transaction/read-write/isolation tests.

Migration v1 chưa tạo bảng nghiệp vụ là chủ ý. Từng nhóm table/session/product/bill/payment chỉ thêm khi vertical slice cần.

**Mọi future Store DO route phải establish/verify Store identity trước khi đọc/ghi operational state.**

## 11. Command trust boundary

Client command intent:

```ts
{
  commandId,
  issuedAt,
  commandType,
  payload
}
```

Client schema strict và không nhận `storeId/deviceId/actorId` làm authority.

Sau authentication/authorization, server enrich thành trusted internal command:

```ts
{
  commandId,
  issuedAt,
  commandType,
  payload,
  storeId,
  deviceId,
  actorId
}
```

- `storeId`: trusted Store context.
- `deviceId`: authenticated Device.
- `actorId`: authenticated Employee.
- `issuedAt`: client intent timestamp, **không** phải authoritative online clock.

Open-session time, pricing, payment và audit execution timestamp phải dùng server time. Offline milestone sau cần clock/sync/boot-anchor policy riêng.

## 12. Operational domain target

Store DO SQLite sẽ tiến hóa theo migration:

```text
table_types
billiard_tables
pricing_policies
pricing_rules
table_sessions
time_adjustments
categories
products
bills
bill_items
payments
table_transfers
bill_merges
processed_commands
domain_events
print_templates
print_template_versions
print_jobs
```

Không tạo tất cả trước khi vertical slice cần.

Invariant:

- loại bàn/pricing là dữ liệu cấu hình, không hard-code,
- money dùng integer unit phù hợp VND, không floating-point,
- timer UI không phải nguồn sự thật,
- giá lịch sử dùng snapshot/version,
- time adjustment cần permission + reason + actor + audit,
- V1 có chuyển bàn/gộp bill, không split bill,
- payment V1: `cash`, `bank_transfer`.

## 13. Printing

Printing chạy ở Desktop Main Process.

V1: 80mm, template mặc định, allowlisted placeholder/block editor, preview dùng cùng template semantics, template versioning và retry/idempotency cho print job.

Không cho arbitrary HTML/CSS/JavaScript.

Chi tiết: [`PRINTING_V1.md`](PRINTING_V1.md).

## 14. Mobile + offline

Mobile PWA hiện là deferred scaffold. Khi triển khai, Mobile dùng cùng Worker APIs, contracts, commands và server business rules; không fork pricing/session/bill logic riêng.

Offline đến sau online vertical slice:

```text
Desktop local SQLite replica
        +
Persistent command outbox
        +
Sync cursor/protocol
        +
Conflict/takeover policy
```

## 15. CI / test gate

```text
Push / Pull Request
        ↓
pnpm install --frozen-lockfile
        ↓
contracts typecheck
        ↓
Worker prod/test typecheck
        ↓
Worker Vitest
        ↓
Desktop typecheck + build
```

Worker suite cover:

- Store DO identity/schema/transactions/isolation,
- Device activation/context/parser/cross-Store invariant,
- system diagnostics auth,
- command trust boundary,
- PIN validation/PBKDF2,
- AuthSession token hashing,
- auth contract/service/routes,
- PIN lockout/session invalidation/logout,
- Device reactivation session revocation + activation-token replay safety,
- auth response cache policy.

Desktop security path hiện dựa trên typecheck/build + manual functional smoke. Automated Electron integration/security tests vẫn thiếu.

## 16. Debt/risk trước remote pilot

### P0 - trước business mutation đầu tiên

1. **M1.3 Permission Context** + server-side `requirePermission`.
2. Mọi business route phải lấy Store/Device/Actor từ trusted contexts.
3. Định nghĩa command idempotency boundary trước mutation thực tế.

### P0 - trước remote/pilot

1. Activation-token issuance/admin UI + permission boundary.
2. Privileged Device transfer/reset/installation-repair flow.
3. Remote D1 migration/secrets/backup/restore/observability review.
4. Code signing/notarization/update channel + packaged Windows smoke.
5. Branch protection cho `main`: merge qua PR + required CI check.

### P1

1. `devices.last_seen_at` heartbeat/touch policy.
2. Align TypeScript version giữa contracts/Worker/Desktop/Mobile.
3. Automated Desktop tests cho trusted URL, IPC sender, safeStorage/recovery, DeviceGate/AuthGate.
4. Chuẩn hóa lint/format gate toàn monorepo trước khi bật trong CI.
5. AuthSession retention/pruning + concurrent-session policy.
6. Xem xét Device-wide anti-abuse budget ngoài per-employee PIN lockout trước public/hostile-device threat model.
7. Tách `AuthGate.tsx` thành state/controller + presentational components trước khi UI POS tăng độ phức tạp.

## 17. Quy tắc không phá vỡ

1. V1 không có branch.
2. Store = tenant/data-isolation boundary.
3. D1 = control plane; Store DO = operational single-writer boundary.
4. Renderer không giữ Device/session secret.
5. Device/Store/Auth/Permission context resolve/enforce server-side.
6. Client-supplied Store/Device/Actor/Permission không phải security authority.
7. Packaged Desktop không gửi credential qua plaintext HTTP.
8. PIN không plaintext/fast-hash; lockout nằm server-side.
9. Auth response không cache.
10. Client `issuedAt` không phải authoritative online time.
11. Money không dùng floating-point.
12. Timer UI không phải nguồn sự thật.
13. Giá lịch sử không đổi theo config mới.
14. Offline đến sau online vertical slice.
15. Mobile dùng chung contracts/commands/server rules.
16. Production/pilot schema chỉ đổi qua reviewed migration.
17. CI phải bảo vệ contracts + Worker + tests + Desktop build.

## 18. Thứ tự triển khai tiếp theo

```text
M0 Foundation ✅
      ↓
M1.1 Device + Store trust ✅
      ↓
M1.2 Employee PIN + AuthGate ✅
      ↓
M1.3 Permission Context ⏭
      ↓
TableType + BilliardTable
      ↓
Pricing foundation + Open session
      ↓
Timer/server-time semantics
      ↓
Products + Bill
      ↓
Payment + finalize
```

Không bắt đầu UI nghiệp vụ lớn trước khi `requirePermission` và trusted command context được nối vào business route thật.
