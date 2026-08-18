# Kiến trúc hệ thống

Cập nhật: **2026-08-18**

> V1 không có mô hình `branch`. Một `Store` là một cửa hàng billiards tại một địa điểm vật lý và đồng thời là tenant/data-isolation boundary.

Scope nghiệp vụ: [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md).

Quyết định kiến trúc:

- [`ADR-001-single-store-no-branch.md`](ADR-001-single-store-no-branch.md)
- [`ADR-002-command-trust-boundary.md`](ADR-002-command-trust-boundary.md)
- [`ADR-003-device-installation-single-store.md`](ADR-003-device-installation-single-store.md)

## 1. Trạng thái hiện tại

**M0 - Foundation** và **M1.1 - Device identity + Store execution context** đã hoàn thành theo local/functional gate và đã qua post-merge trust-boundary audit.

Hiện có:

- Electron Desktop main/preload/renderer boundary.
- Hono Worker gateway/API.
- D1 Store-based control plane.
- `STORE_DO` + SQLite-backed `StoreDurableObject`, một DO / Store.
- Store identity guard + Store DO migration/version runner.
- one-time Device activation + hashed Device credential.
- một `installationId` chỉ thuộc tối đa một Store tại một thời điểm.
- trusted Store context resolve server-side từ Device.
- protected `/api/system/*` diagnostics bằng secret riêng.
- client command envelope không được tự khai Store/Device/Actor identity authority.
- Electron installation identity + encrypted Device credential ở Main Process.
- DeviceGate ở Renderer nhưng không expose raw secret.
- **29 Worker tests** và root CI.

Bước nghiệp vụ tiếp theo: **M1.2 - Employee + PIN/AuthGate**.

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
       │ device/auth        │       │ SQLite operational DB  │
       └────────────────────┘       └───────────┬────────────┘
                                               │
                                               ▼
                                  table/session/product/bill/
                                  payment/command/event/print
```

V1 không chứa `branches`, `branch_id`, `BRANCH_DO`, `BranchDurableObject` hoặc UI chọn/chuyển branch.

## 3. Store là tenant boundary

Một Store = một cửa hàng vật lý.

Guardrail:

- dữ liệu Store A không được đọc/ghi sang Store B,
- client-supplied `storeId` không phải security authority,
- mọi Store-scoped entity từ payload phải được kiểm tra thuộc trusted Store trước mutation,
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
      ├── encrypted credential
      ├── future local SQLite/sync
      ├── printing
      └── updater
```

Security rules:

- `contextIsolation: true`, `nodeIntegration: false`, renderer sandbox bật.
- Renderer không nhận `deviceSecret` hoặc security token trực tiếp.
- Privileged IPC chỉ chấp nhận top-level trusted renderer frame.
- Development renderer trust theo Vite origin.
- Packaged renderer trust đúng packaged `renderer/index.html`, không phải mọi `file:` URL.
- Chromium permissions deny-by-default; chỉ mở capability khi có feature thật.
- DevTools chỉ bật ở development.
- External navigation deny-by-default; chỉ origin được allowlist rõ ràng mới được mở.
- Packaged Desktop chỉ kết nối backend qua HTTPS; HTTP development chỉ cho loopback.

### Local Device files

```text
app.getPath('userData')/
└── device/
    ├── installation.json
    └── credential.bin
```

- `installation.json`: UUID ổn định, không phải secret.
- `credential.bin`: encrypted `deviceId + deviceSecret` bằng async `safeStorage`.
- credential hỏng → controlled reactivation.
- secure storage unavailable → fail-closed `local_error`.
- installation identity malformed → fail-closed; không tự sinh UUID mới để tránh stale/orphan Device.

Electron 43 dùng lazy binary download; `dev/start` chạy `install-electron --no` trước khi mở app.

Packaging identity hiện là `com.billiards.pos` / `Billiards POS`; signing/notarization/update channel thật vẫn là release gate.

## 5. D1 Control Plane

Migrations hiện tại:

```text
0001_init_control_plane.sql
0002_add_device_credentials.sql
0003_enforce_global_device_installation.sql
```

Các bảng control-plane chính:

```text
stores
users
roles
permission_catalog
role_permissions
store_memberships
devices
device_activation_tokens
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

### Activation token

`device_activation_tokens` chỉ lưu token hash, Store, status, expiry và used-device metadata. Raw token không persist.

Consume/verification flow đã có; issuance/admin UI chưa có.

### Auth session foundation

`auth_sessions` gắn:

```text
Store + User + Membership + Device
```

D1 chỉ lưu session token hash. PIN credential/rate-limit/lockout sẽ được thêm cùng M1.2.

## 6. Device + Store trust boundary

```text
Desktop Main
      │ Authorization: Device <id>.<secret>
      ▼
Worker
      ├── validate auth scheme / UUID / secret format
      ├── SHA-256 secret + constant-time compare
      ├── lookup D1 Device + Store
      ├── reject invalid/revoked/inactive states
      └── build trusted DeviceContext
              │
              ▼
         trusted Store
```

`GET /api/pos/context` là context/smoke endpoint hiện tại.

Client `x-store-id` không thay đổi trusted Store context.

Employee/Auth/Permission context ở M1.2/M1.3 phải tiếp tục nằm **sau** Device authentication. Employee session token sau này không được bypass revoked Device hoặc inactive Store.

## 7. System diagnostics boundary

```text
/api/system/db-health
/api/system/stores/:storeId/do-health
```

Đây không phải POS business API.

- Nếu `SYSTEM_DIAGNOSTICS_TOKEN` chưa được cấu hình đủ mạnh → route trả 404 fail-closed.
- Khi bật → yêu cầu `Authorization: Bearer <system-token>`.
- Secret local đặt trong ignored `.dev.vars`; secret remote phải dùng deployment secret/config.

Diagnostic path `storeId` không phải precedent cho business mutation routing.

## 8. Store Durable Object

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
- mỗi migration chạy trong `transactionSync`,
- current Store schema version 1 foundation,
- transaction/read-write/isolation tests.

Migration v1 chưa tạo bảng nghiệp vụ là chủ ý. Từng nhóm table/session/product/bill/payment chỉ thêm khi vertical slice cần.

**Quy tắc cho mọi future Store DO route:** phải establish/verify Store identity trước khi đọc/ghi operational state.

## 9. Command trust boundary

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

Sau authentication, server enrich thành trusted internal command:

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
- `actorId`: authenticated Employee session.
- `issuedAt`: client intent timestamp, **không** phải authoritative online clock.

Open-session time, pricing, payment và audit execution timestamp phải dùng server time. Offline milestone sau cần clock/sync/boot-anchor policy riêng.

## 10. Operational domain target

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

Các invariant đã chốt:

- loại bàn/pricing là dữ liệu cấu hình, không hard-code,
- money dùng integer unit phù hợp VND, không floating-point,
- timer UI không phải nguồn sự thật,
- giá lịch sử dùng snapshot/version để config mới không sửa quá khứ,
- time adjustment cần permission + reason + actor + audit,
- V1 có chuyển bàn/gộp bill, không có split bill,
- payment V1: `cash`, `bank_transfer`.

## 11. Printing

Printing chạy ở Desktop Main Process.

V1: 80mm, template mặc định, allowlisted placeholder/block editor, preview dùng cùng template semantics, template versioning và retry/idempotency cho print job.

Không cho arbitrary HTML/CSS/JavaScript.

Chi tiết: [`PRINTING_V1.md`](PRINTING_V1.md).

## 12. Mobile + offline

Mobile PWA là deferred scaffold. Khi triển khai, Mobile dùng cùng Worker APIs, contracts, commands và server business rules; không fork pricing/session/bill logic riêng.

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

## 13. CI / test gate

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

Worker tests hiện tại:

```text
Store Durable Object               9
Device context/activation          9
Device auth parser                 4
System diagnostics auth            3
Cross-Store installation           1
Command trust boundary             3
------------------------------------
Total                             29
```

Desktop security path hiện được bảo vệ bằng typecheck/build + manual smoke; automated Electron integration/security tests vẫn còn thiếu.

## 14. Debt còn mở trước remote/pilot

1. Activation-token issuance/admin UI và permission boundary.
2. Privileged Device transfer/reset/installation-repair flow.
3. `devices.last_seen_at` heartbeat/touch policy.
4. Align TypeScript version giữa `@billiards/contracts` và Worker/Desktop.
5. Automated Desktop tests cho trusted URL, IPC sender, safeStorage/recovery và DeviceGate.
6. Code signing/notarization/update channel + packaged Windows smoke.
7. Remote D1 migrations/secrets/observability/backup review.
8. Khi M1.2 có session: authorize phải re-check Device + Store + User + Membership + Role status theo policy đã chốt.

## 15. Quy tắc không phá vỡ

1. V1 không có branch.
2. Store = tenant/data-isolation boundary.
3. D1 = control plane; Store DO = operational single-writer boundary.
4. Renderer không giữ Device/session secret.
5. Device/Store/Auth/Permission context resolve/enforce server-side.
6. Client-supplied Store/Device/Actor ID không phải security authority.
7. Packaged Desktop không gửi credential qua plaintext HTTP.
8. Client `issuedAt` không phải authoritative online time.
9. Money không dùng floating-point.
10. Timer UI không phải nguồn sự thật.
11. Giá lịch sử không đổi theo config mới.
12. Offline đến sau online vertical slice.
13. Mobile dùng chung contracts/commands/server rules.
14. Production/pilot schema chỉ đổi qua reviewed migration.
15. CI phải tiếp tục bảo vệ contracts + Worker + tests + Desktop build.

## 16. Thứ tự triển khai tiếp theo

```text
M0 Foundation ✅
      ↓
M1.1 Device + Store trust ✅
      ↓
M1.2 Employee + PIN/AuthGate
      ↓
M1.3 Permission context
      ↓
TableType + BilliardTable
      ↓
Open session + timer semantics
      ↓
Products + Bill
      ↓
Payment + finalize
```

Không bắt đầu UI nghiệp vụ lớn trước khi Device/Store/Auth/Permission context đủ ổn định.