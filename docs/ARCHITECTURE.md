# Kiến trúc hệ thống

Cập nhật: **2026-08-18**

> V1 không có mô hình `branch`. Một `Store` là một cửa hàng billiards tại một địa điểm vật lý và đồng thời là tenant/data-isolation boundary.

Scope nghiệp vụ: [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md).

Quyết định kiến trúc:

- [`ADR-001-single-store-no-branch.md`](ADR-001-single-store-no-branch.md)
- [`ADR-002-command-trust-boundary.md`](ADR-002-command-trust-boundary.md)
- [`ADR-003-device-installation-single-store.md`](ADR-003-device-installation-single-store.md)

## 1. Trạng thái hiện tại

Đã hoàn thành theo local/functional gate:

- **M0 - Foundation**,
- **M1.1 - Device identity + Store execution context**,
- **M1.2 - Employee PIN authentication + AuthGate**,
- **M1.3 - Permission Context**.

Hiện có:

- Electron Desktop main/preload/renderer trust boundary,
- Hono Worker gateway/API,
- D1 Store-based control plane,
- `STORE_DO` + SQLite-backed `StoreDurableObject`, một DO / Store,
- Store identity guard + Store DO migration/version runner,
- one-time Device activation + hashed Device credential,
- trusted Store context resolve server-side từ authenticated Device,
- employee PIN credential PBKDF2-SHA256 + server-side lockout,
- AuthSession bind Store + User + Membership + Device + PIN credential version,
- trusted `AuthContext`,
- trusted `PermissionContext` + `requirePermission`,
- safe `/api/auth/permissions` capability snapshot cho Desktop UX,
- DeviceGate → AuthGate → PermissionGate trên Desktop,
- protected `/api/system/*` diagnostics,
- strict command trust boundary không nhận Store/Device/Actor authority từ client,
- root CI cho contracts/Worker/tests/Desktop build.

Bước tiếp theo: **M1.4 - TableType + BilliardTable**.

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

D1 giữ control-plane data. Store Durable Object là operational single-writer/consistency boundary cho từng Store. V1 không chứa `branches`, `branch_id`, `BRANCH_DO`, `BranchDurableObject` hoặc UI chọn/chuyển branch.

## 3. Store là tenant boundary

Một Store = một cửa hàng vật lý.

Guardrail:

- dữ liệu Store A không được đọc/ghi sang Store B,
- client-supplied `storeId` không phải security authority,
- mọi Store-scoped entity từ payload phải được kiểm tra thuộc trusted Store trước mutation,
- Device context phải được xác thực trước Employee/Auth/Permission context,
- operational request chỉ route tới `STORE_DO.idFromName(trustedStoreId)`,
- Store DO phải verify persisted Store identity trước khi đọc/ghi,
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

- `contextIsolation: true`, `nodeIntegration: false`, renderer sandbox bật,
- Renderer không nhận `deviceSecret` hoặc raw `sessionToken`,
- Renderer/Preload không tự xây `Authorization` hoặc `X-Auth-Session`,
- Preload expose method hẹp theo IPC channel, không expose raw `ipcRenderer`,
- privileged IPC chỉ chấp nhận trusted top-level renderer frame,
- Chromium permissions deny-by-default,
- DevTools chỉ bật ở development,
- external navigation deny-by-default,
- packaged Desktop chỉ kết nối backend qua HTTPS; HTTP development chỉ cho loopback.

### Local credential files

```text
app.getPath('userData')/
├── device/
│   ├── installation.json
│   └── credential.bin
└── auth/
    └── session.bin
```

- `installation.json`: UUID ổn định, không phải secret,
- `device/credential.bin`: encrypted `deviceId + deviceSecret` bằng async `safeStorage`,
- `auth/session.bin`: encrypted `deviceId + sessionToken` bằng async `safeStorage`,
- Device credential hỏng → controlled reactivation,
- Auth session credential hỏng → discard + PIN login lại,
- secure storage unavailable → fail-closed,
- Device reactivation → local AuthSession credential không được tiếp tục tin cậy.

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

D1 **không** là nơi lưu `table_types`, `billiard_tables`, sessions, products, bills hoặc payments.

### Device invariant

V1 behavior:

- same Store + same installation → reactivation hợp lệ, giữ Device row và rotate credential,
- different Store + same installation → conflict,
- original Store/device không bị chuyển/revoke ngầm,
- chuyển Store sau này phải là privileged transfer/recovery flow.

### Activation token + AuthSession revocation

Khi Device reactivation hợp lệ:

1. upsert/rotate Device credential,
2. revoke active AuthSessions bind Device đó với reason `device_reactivated`,
3. consume activation token.

Control-plane transition dùng D1 transaction/batch semantics; replay/expired token không được revoke session hiện hành.

## 6. Device + Store trust boundary

```text
Desktop Main
      │ Authorization: Device <id>.<secret>
      ▼
requireDevice
      ├── validate scheme / UUID / secret format
      ├── hash + constant-time comparison
      ├── lookup Device + Store
      ├── reject invalid/revoked/inactive states
      └── build trusted DeviceContext
              │
              ▼
         trusted Store
```

Client `x-store-id` hoặc body `storeId` không thay đổi trusted Store context.

## 7. Employee PIN + AuthSession boundary

### PIN

- chuỗi 4-6 chữ số, giữ leading zero,
- random salt 16 bytes,
- PBKDF2-HMAC-SHA256,
- production iterations hiện tại: 600,000,
- D1 chỉ lưu hash/salt/algorithm/iterations/version,
- lockout scope `Store + User + Device`, server-side.

### AuthSession

Login thành công tạo high-entropy session secret; D1 chỉ lưu SHA-256 hash của secret.

Session bind:

```text
Store
+ User
+ Membership
+ Device
+ PIN credential version
```

Khi authenticate session, Worker re-check Store/Device/User/Membership/Role/PIN status, credential version, expiry/revocation và session secret hash. `requireAuthSession` tạo trusted `AuthContext`; client không tự khai actor authority.

### Auth API

```text
GET  /api/auth/employees     Device required
POST /api/auth/pin           Device required
GET  /api/auth/session       Device + AuthSession required
GET  /api/auth/permissions   Device + AuthSession required
POST /api/auth/logout        Device + AuthSession required
```

Toàn bộ `/api/auth/*` response có `Cache-Control: no-store`. `/pin` là endpoint duy nhất trả raw session token và Desktop Main phải consume/lưu secret đó.

## 8. Permission boundary - M1.3 implemented

Authorization chain hiện tại:

```text
requireDevice
      ↓
requireAuthSession
      ↓
Trusted AuthContext
      ↓
resolvePermissionContext
      │ D1 current Membership + Role + role_permissions
      ▼
Trusted PermissionContext
      ↓
requirePermission('table.open')
      ↓
business handler
```

### Permission source

`permission_catalog` là system-controlled allowlist. `role_permissions` grant catalog capability cho role của đúng Store.

Shared contracts định nghĩa cùng allowlist qua `PERMISSION_KEYS`/`PermissionKeySchema`, và regression test khóa contract list khớp D1 catalog.

### Resolver rules

- resolver nhận **trusted `AuthContext`**, không nhận trusted identity từ body/header,
- query current Membership/Role/permissions của đúng Store,
- Membership hoặc Role inactive → authorization không tiếp tục,
- absence of permission = deny,
- unknown permission key trong DB = schema/code drift → fail-closed,
- role reassignment sau login có hiệu lực khi request kế tiếp authenticate/resolve current context,
- permission removal có hiệu lực ở request kế tiếp.

### Enforcement semantics

```text
401
→ Device/AuthSession/current actor context không còn hợp lệ

403 permission_denied
→ actor đã authenticated nhưng thiếu capability

503 authorization_unavailable
→ Worker không resolve được authorization state; fail-closed
```

Mọi business route phải gọi `requirePermission(...)` phù hợp. UI hide/disable không thay thế server authorization.

### Client capability snapshot

`GET /api/auth/permissions` trả:

```json
{
  "permissions": ["table.view", "table.open"]
}
```

Electron Main gắn raw Device/AuthSession credentials. IPC/Preload chỉ chuyển safe response sang Renderer.

Renderer `PermissionGate` tạo `ReadonlySet<PermissionKey>` + `hasPermission(...)` để dùng cho UX.

**Invariant:**

```text
Renderer hasPermission(...) = UX hint/snapshot
Worker requirePermission(...) = security authority
```

Capability snapshot hiện refresh khi gate mount/retry. Nếu permission đổi khi UI đang mở thì UI có thể tạm stale; protected Worker request vẫn dùng current authorization state. Refresh-on-focus/403/realtime là P1 UX improvement, không phải security boundary.

## 9. System diagnostics boundary

```text
/api/system/db-health
/api/system/stores/:storeId/do-health
```

Đây không phải POS business API. Nếu diagnostics secret chưa cấu hình đủ mạnh thì route fail-closed; diagnostic path `storeId` không phải precedent cho business mutation routing.

## 10. Store Durable Object

```text
trusted storeId
      ↓
STORE_DO.idFromName(storeId)
      ↓
StoreDurableObject
      ↓
verify persisted Store identity
      ↓
SQLite operational DB
```

Foundation hiện có:

- `system_metadata`,
- persisted `store_id`,
- Store identity mismatch guard,
- schema migration runner,
- sequential migration validation,
- future/newer schema guard,
- migration transaction,
- current schema version **1 - foundation**,
- transaction/read-write/isolation tests.

Version 1 chủ ý chưa tạo bảng nghiệp vụ.

### M1.4 schema direction

M1.4 tạo Store DO migration version 2 tối thiểu cho:

```text
table_types
billiard_tables
```

Không tạo pricing/session/product/bill/payment schema trước khi milestone cần.

Table master lifecycle ở M1.4 chỉ dùng `active/disabled`. **Không persist `occupied` như master flag**; từ M1.5 `available/occupied` phải derive từ active `TableSession` để không có hai nguồn sự thật.

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

Client schema strict và không nhận `storeId/deviceId/actorId/permission` làm authority.

Sau authentication/authorization, server enrich trusted execution context từ Worker contexts.

- `storeId`: trusted Store,
- `deviceId`: authenticated Device,
- `actorId`: authenticated Employee,
- permission: Worker-resolved capability,
- `issuedAt`: client intent timestamp, không phải authoritative online clock.

Open-session time, pricing, payment và audit execution timestamp phải dùng server time. Offline milestone sau có clock/sync/boot-anchor policy riêng.

## 12. Operational domain target

Store DO SQLite sẽ tiến hóa theo milestone:

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

- loại bàn/pricing là configurable data, không hard-code,
- money dùng integer VND, không floating-point,
- timer UI không phải nguồn sự thật,
- table occupancy derive từ active session,
- giá lịch sử dùng snapshot/version,
- time adjustment cần permission + reason + actor + audit,
- V1 có chuyển bàn/gộp bill, không split bill,
- payment V1: `cash`, `bank_transfer`.

## 13. Printing

Printing chạy ở Desktop Main Process.

V1: 80mm, template mặc định, allowlisted placeholder/block editor, preview dùng cùng template semantics, template versioning và retry/idempotency cho print job. Không cho arbitrary HTML/CSS/JavaScript.

Chi tiết: [`PRINTING_V1.md`](PRINTING_V1.md).

## 14. Mobile + offline

Mobile PWA hiện là deferred scaffold. Khi triển khai, Mobile dùng cùng Worker APIs, contracts, permissions, commands và server business rules.

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

Worker suite hiện cover:

- Store DO identity/schema/transactions/isolation,
- Device activation/context/cross-Store invariant,
- system diagnostics auth,
- command trust boundary,
- PIN validation/PBKDF2,
- AuthSession credential/routes/lockout/invalidation/logout,
- Device reactivation session revocation + token replay safety,
- auth response cache policy,
- permission catalog alignment,
- full Device → AuthSession → Permission integration,
- granted/missing capability,
- permission revocation/current role changes,
- disabled/suspended actor state,
- cross-Store/client-spoof authorization cases,
- `/api/auth/permissions` behavior.

Desktop security path hiện dựa trên typecheck/build + manual functional smoke. Automated Electron integration/security tests vẫn thiếu.

## 16. Debt/risk

### P0 trước business mutation

1. ✅ M1.3 Permission Context hoàn thành.
2. Mọi business route mới phải lấy Store/Device/Actor từ trusted contexts và gọi `requirePermission`.
3. Command idempotency bắt buộc trước high-risk mutation như OpenTableSession; M1.4 configuration mutation vẫn phải có transaction/constraint/error semantics rõ ràng.

### P0 trước remote/pilot

1. Activation-token issuance/admin UI + permission boundary.
2. Privileged Device transfer/reset/installation-repair flow.
3. Remote D1 migration/secrets/backup/restore/observability review.
4. Code signing/notarization/update channel + packaged Windows smoke.
5. Branch protection cho `main`: PR-only + required CI check.

### P1

1. `devices.last_seen_at` heartbeat/touch policy.
2. Align TypeScript versions giữa contracts/Worker/Desktop/Mobile.
3. Automated Desktop tests cho trusted URL, IPC sender, safeStorage/recovery, DeviceGate/AuthGate/PermissionGate.
4. Chuẩn hóa formatter/linter và đưa vào CI sau khi baseline sạch.
5. AuthSession retention/pruning + concurrent-session policy.
6. Device-wide anti-abuse budget nếu threat model mở rộng.
7. Tách `AuthGate.tsx` thành controller/hooks + presentational components.
8. Normalize `PermissionGate.tsx` formatting.
9. Permission UX refresh strategy khi role-management/realtime được thêm.

## 17. Quy tắc không phá vỡ

1. V1 không có branch.
2. Store = tenant/data-isolation boundary.
3. D1 = control plane; Store DO = operational single-writer boundary.
4. Renderer không giữ Device/session secret.
5. Device/Store/Auth/Permission context resolve/enforce server-side.
6. Client-supplied Store/Device/Actor/Role/Permission không phải security authority.
7. Renderer capability snapshot chỉ là UX; Worker authorization mới là authority.
8. Packaged Desktop không gửi credential qua plaintext HTTP.
9. PIN không plaintext/fast-hash; lockout nằm server-side.
10. Auth response không cache.
11. Client `issuedAt` không phải authoritative online time.
12. Money không dùng floating-point.
13. Timer UI không phải nguồn sự thật.
14. Table occupancy không được có duplicate master/session source of truth.
15. Giá lịch sử không đổi theo config mới.
16. Offline đến sau online vertical slice.
17. Mobile dùng chung contracts/permissions/commands/server rules.
18. Production/pilot schema chỉ đổi qua reviewed migration.
19. CI phải bảo vệ contracts + Worker + tests + Desktop build.

## 18. Thứ tự triển khai tiếp theo

```text
M0 Foundation ✅
      ↓
M1.1 Device + Store trust ✅
      ↓
M1.2 Employee PIN + AuthGate ✅
      ↓
M1.3 Permission Context ✅
      ↓
M1.4 TableType + BilliardTable ⏭
      ↓
M1.5 Pricing + Open TableSession
      ↓
M1.6 Products + Bill + Payment + finalize
```

M1.4 phải nối authorization đã có vào business route thật đầu tiên. Không bắt đầu OpenTableSession/timer trước khi table foundation, Store isolation và `table.view`/`table.manage` gate đều xanh.