# Kiến trúc hệ thống

Cập nhật: **2026-08-18**

> V1 không có mô hình `branch`. Một `Store` là một cửa hàng billiards tại một địa điểm vật lý và đồng thời là tenant/data-isolation boundary của hệ thống.

Scope nghiệp vụ đã khóa tại [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md). Quyết định single-store được ghi tại [`ADR-001-single-store-no-branch.md`](ADR-001-single-store-no-branch.md).

## 1. Trạng thái kiến trúc hiện tại

**M0 - Foundation đã hoàn thành. M1.1 - Device identity + Store execution context đã hoàn thành theo functional/local gate.**

Hiện foundation + trust boundary đã có:

- Electron desktop main/preload/renderer security boundary.
- Hono Worker gateway/API.
- D1 Store-based control plane.
- `STORE_DO` + SQLite-backed `StoreDurableObject`.
- Store identity guard và Store DO schema migration/versioning runner.
- Shared API/command/device contracts.
- one-time device activation + hashed device credential.
- trusted Store context resolve server-side từ Device.
- Electron installation identity + encrypted device credential ở Main Process.
- DeviceGate ở renderer nhưng không expose raw device secret.
- 18 Worker tests: 9 Store DO + 9 Device context.
- GitHub Actions CI quality gate.

Bước nghiệp vụ tiếp theo là **M1.2 - Employee + PIN/AuthGate**, sau đó mới gắn Permission context và POS business commands.

## 2. Mục tiêu

Hệ thống phải đáp ứng:

- POS desktop chạy ổn định tại cửa hàng, ưu tiên Windows khi triển khai.
- Mobile PWA có thể thao tác đầy đủ như POS ở milestone sau.
- Backend cloud để xác thực, quản lý Store/user/device và đồng bộ.
- Operational state có single-writer boundary rõ ràng.
- Có đường tiến hóa tới offline-first mà không viết lại command semantics.
- Có printing 80mm và remote desktop update ở các milestone sau.

## 3. Sơ đồ tổng thể

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
                                  tables / pricing / sessions
                                  products / bills / payments
                                  commands / events / print refs
```

Không còn trong architecture V1:

- `branches`,
- `branch_id`,
- `branch_registry`,
- `BRANCH_DO`,
- `BranchDurableObject`,
- chọn/chuyển branch trong UI.

## 4. Store là tenant boundary

Một Store = một cửa hàng vật lý.

Trong UI/domain dùng từ `Store` / `Cửa hàng`. Có thể xem Store là tenant kỹ thuật, nhưng không cần expose khái niệm tenant cho người dùng cuối.

Dữ liệu Store A không được đọc/ghi nhầm sang Store B. Client-supplied `storeId` không phải security authority.

Nếu sau này hỗ trợ chuỗi nhiều địa điểm, đó là capability mới. Không giữ branch trong V1 chỉ để dự phòng.

## 5. Desktop process boundary

```text
Renderer (React)
      │
      │ window.desktopApi
      ▼
Preload
      │
      │ narrow typed IPC
      ▼
Main Process
      │
      ├── HTTP/backend client
      ├── installation identity
      ├── encrypted device credential
      ├── future local SQLite
      ├── printing
      ├── sync/outbox
      └── updater
```

Nguyên tắc:

- Renderer không có Node integration.
- `contextIsolation` và renderer sandbox được bật.
- Renderer không expose `ipcRenderer` trực tiếp.
- Preload chỉ expose API hẹp, typed.
- `deviceSecret` chỉ tồn tại ở Main Process/secure storage và Authorization header; renderer không có API đọc secret.
- IPC privileged handler phải validate sender và chỉ chấp nhận top-level trusted renderer frame.
- Development renderer được trust theo Vite renderer origin; packaged renderer được trust theo đúng packaged renderer file, không phải mọi `file:` URL.
- Main Process quản lý network orchestration, local storage, printing và updater.
- Packaged Desktop chỉ kết nối backend qua HTTPS. HTTP chỉ được phép cho loopback trong development.
- Navigation/open-external được kiểm soát ở Main Process; external URL chỉ mở qua allowlisted secure protocol.

### Device local files

```text
app.getPath('userData')/
└── device/
    ├── installation.json   # UUID, không phải secret
    └── credential.bin      # encrypted deviceId + deviceSecret
```

`credential.bin` dùng Electron async `safeStorage`; code xử lý key-rotation signal trước khi ghi lại credential.

## 6. D1 Control Plane - model hiện tại

Control plane hiện có:

- `0001_init_control_plane.sql`: Store/User/Role/Permission/Membership/Device/AuthSession/StoreRegistry foundation.
- `0002_add_device_credentials.sql`: device credential metadata + one-time activation token.

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
auth_sessions
store_registry
```

### `stores`

Metadata cửa hàng gồm:

- tên,
- slug,
- trạng thái,
- địa chỉ,
- số điện thoại,
- timezone,
- locale,
- currency.

### User / membership / permission

Các role mặc định có thể gồm Owner/Manager/Cashier/Staff nhưng permission model không hard-code theo bốn tên này.

`permission_catalog` là capability allowlist do hệ thống quản lý. Owner có thể gán capability hợp lệ cho role, không tự phát minh security permission key tùy ý.

Một user có một membership/role trong Store ở V1. Permission phải kiểm tra server-side; UI chỉ ẩn/disable để hỗ trợ trải nghiệm.

### Device

Mỗi device row thuộc một Store và có:

- `installation_id`,
- tên thiết bị,
- device type/platform,
- status,
- app version,
- credential hash/version/timestamps,
- registration/revocation metadata.

Activation flow hiện tại:

```text
raw one-time token
      │
      ▼ SHA-256
D1 token_hash
      │ validate active + expiry + Store active
      ▼
create/reactivate Device
      │
      ├── raw deviceSecret trả đúng một lần
      └── D1 chỉ lưu SHA-256(deviceSecret)
```

Reactivation cùng `Store + installationId` giữ nguyên device row, rotate secret, tăng `credential_version`, clear revoked state và consume activation token mới.

**Chưa chốt:** cùng một `installationId` có được re-assign sang Store khác hay phải fail-closed/đi qua transfer flow. Không thêm global uniqueness trước khi policy này được chốt.

`last_seen_at` hiện mới là schema metadata; chưa có heartbeat/touch policy chính thức.

### Device activation token

`device_activation_tokens` chỉ lưu hash, status, expiry, Store và used-device metadata. Raw token không persist.

Verification/consume flow đã có. API/admin UI để **phát hành** activation token chưa có và sẽ được thiết kế ở control/admin boundary sau.

### Auth session

Session foundation gắn với:

```text
store + user + membership + device
```

Không lưu raw session token; D1 lưu hash.

PIN credential chưa có. PIN hashing, rate limit và lockout sẽ được thêm cùng AuthGate trong M1.2.

### Store registry

`store_registry` giữ durable-object key/provisioning/schema metadata control-plane.

Ở code hiện tại, Store DO routing vẫn dùng `STORE_DO.idFromName(storeId)` trực tiếp; `store_registry` chưa phải routing authority. Operational schema version thật nằm trong SQLite của Store DO qua `system_metadata`.

## 7. Device + Store request trust boundary

M1.1 đã triển khai trust chain:

```text
Desktop Main
      │
      │ Authorization:
      │ Device <deviceId>.<deviceSecret>
      ▼
Cloudflare Worker
      │
      ├── parse credential
      ├── SHA-256 secret + constant-time compare
      ├── lookup D1 Device + Store
      ├── reject invalid/revoked/inactive states
      └── build trusted DeviceContext
              │
              ▼
       trusted Store ID
```

Guardrail:

- client không được tự gửi `storeId` và được tin mặc định,
- Worker resolve Store từ `devices.store_id`,
- spoofed `x-store-id` không thay đổi context,
- request không có device hợp lệ fail-closed,
- inactive Store fail-closed,
- Employee/Auth/Permission context sẽ được nối tiếp từ trusted Store này.

`GET /api/pos/context` là endpoint smoke/context hiện tại.

### System diagnostics

`/api/system/db-health` và `/api/system/stores/:storeId/do-health` là foundation diagnostics. Chúng **không phải business routing contract** và hiện không dùng Device/Employee/Permission boundary.

Trước remote/pilot phải protect, disable hoặc tách chúng khỏi public surface. Không được dùng arbitrary path `storeId` từ các endpoint diagnostic làm precedent cho POS mutation.

## 8. Store Durable Object - operational data plane

Flow foundation hiện tại:

```text
trusted storeId
  ↓
STORE_DO.idFromName(storeId)
  ↓
StoreDurableObject
  ↓
SQLite operational database
```

Một Store có một operational single-writer boundary.

Foundation đã triển khai:

- `StoreDurableObject` export/binding,
- SQLite storage,
- `system_metadata`,
- persisted `store_id`,
- identity mismatch guard,
- health endpoint,
- schema migration runner,
- current Store schema version 1 foundation,
- transaction-wrapped migration application,
- migration sequence validation,
- reject invalid/newer schema version.

Automated tests bao phủ:

- fresh schema version,
- migration idempotency,
- newer-schema guard,
- Store identity persistence,
- SQLite read/write,
- transaction commit,
- transaction rollback,
- data isolation giữa hai Store DO,
- identity lock.

Lợi ích:

- transaction cục bộ cho table/session/bill/payment,
- command idempotency rõ,
- realtime connection có điểm hội tụ,
- desktop/mobile không ghi trực tiếp database,
- cô lập operational data theo Store.

## 9. Operational entities dự kiến

SQLite trong Store DO sẽ tiến hóa theo migration riêng:

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

Đây là target domain map. **Không tạo tất cả trong migration foundation.** Từng nhóm entity chỉ thêm khi vertical slice cần và có test/migration tương ứng.

## 10. Loại bàn là dữ liệu cấu hình

Không dùng enum cứng cho `bàn líp`, `bàn lỗ`, ...

`table_types` cho phép Owner tự tạo loại bàn và gắn pricing policy phù hợp.

Một bàn cụ thể tham chiếu `table_type_id` và có thể có override nếu pricing scope cần.

## 11. Pricing

Pricing không hard-code một mức giá duy nhất.

Target cho phép:

- base hourly rate theo loại bàn,
- time band,
- ngày/nhóm ngày,
- optional per-table override,
- rounding/time policy.

Khi phiên bắt đầu/được tính tiền, phải lưu đủ policy/version/snapshot để thay đổi giá tương lai không làm sai lịch sử.

Money lưu bằng integer unit phù hợp với VND, không dùng floating-point cho tiền.

## 12. Session, bill và time adjustment

`TableSession` là nguồn sự thật cho thời gian chơi; timer UI chỉ là cách hiển thị.

Điều chỉnh thời gian:

- cần permission,
- lý do bắt buộc,
- actor bắt buộc,
- audit delta hoặc before/after.

Bill V1 gồm tiền bàn + sản phẩm, chưa có discount/surcharge.

Giá sản phẩm snapshot vào bill item tại thời điểm bán.

## 13. Chuyển bàn và gộp bill

V1 có:

- chuyển bàn,
- gộp bill.

V1 không có tách bill.

Hai nghiệp vụ đi qua command transaction, có audit và state transition rõ; không copy/delete ad-hoc.

## 14. Thanh toán

Phương thức V1:

- cash,
- bank_transfer.

Payment completion phải transactionally finalize bill/session theo rule nghiệp vụ và trả bàn về trạng thái phù hợp.

QR thanh toán là rendering concern dựa trên cấu hình chuyển khoản của Store; không phải payment method thứ ba.

## 15. Printing boundary

Printing chạy Main-side trên Desktop.

V1:

- khổ 80mm,
- template mặc định,
- Owner chỉnh nội dung,
- placeholder/block allowlist,
- preview,
- versioned template,
- Windows driver/spooler integration.

Ví dụ placeholder:

```text
{ten_cua_hang}
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

Không cho arbitrary HTML/CSS/JavaScript trong V1 template editor.

Preview và print dùng cùng template semantics.

Chi tiết: [`PRINTING_V1.md`](PRINTING_V1.md).

## 16. Command model

Mutation nghiệp vụ đi qua command semantics:

```text
Client intent
   ↓
CommandEnvelope
   ↓
Worker Device/Auth/Permission boundary
   ↓
Store Durable Object
   ↓
Idempotency check
   ↓
Domain validation
   ↓
Transactional mutation
   ↓
ProcessedCommand + DomainEvent
   ↓
Response / realtime propagation
```

Shared `CommandEnvelope` đã tồn tại trong `@billiards/contracts`. Business-specific commands thêm theo vertical slice.

Không triển khai full event sourcing. Current state vẫn materialize trong SQLite; events phục vụ audit/realtime/sync/integration.

## 17. Shared packages

### `packages/contracts`

Hiện có runtime/type contracts cho:

- API health response,
- `CommandEnvelope`,
- Device type/platform,
- Device activation request/response,
- Device execution context.

Desktop Main bundle workspace contracts thay vì để Electron runtime load raw TypeScript package trực tiếp.

Cần giữ TypeScript version của contracts và consumer packages tương thích; không dùng syntax/type feature mà Worker/Desktop compiler chưa hiểu.

### `packages/domain`

Hiện vẫn là scaffold foundation. Từ M1 business slice sẽ chứa:

- money/time primitives,
- pricing,
- table/session/bill state transitions,
- transfer/merge rules,
- pure validation.

### `packages/shared`

Chỉ chứa utility thật sự generic.

## 18. Mobile PWA

Mobile sau này thao tác đầy đủ như POS theo permission:

- xem/mở bàn,
- thêm món,
- chuyển bàn,
- gộp bill,
- thanh toán,
- xem hóa đơn/báo cáo,
- quản lý phần được cấp quyền.

Business rule không duplicate riêng trong mobile.

## 19. Offline boundary

Offline triển khai sau khi online command flow ổn định:

```text
Desktop local SQLite replica
        +
Persistent command outbox
        +
Sync cursor/protocol
        +
Conflict/takeover policy
```

Store DO vẫn là authoritative cloud operational writer trong kiến trúc mục tiêu.

## 20. CI và release/update boundary

Quality CI hiện tại:

```text
Push / Pull Request
        ↓
GitHub Actions - Ubuntu
        ↓
pnpm install --frozen-lockfile
        ↓
contracts typecheck
        ↓
Worker production/test typecheck
        ↓
Worker Vitest
        ↓
Desktop typecheck + build
```

Worker tests hiện gồm 18 test: 9 Store DO + 9 Device context.

Desktop DeviceGate/secure-storage path hiện được bảo vệ bởi typecheck/build + manual smoke; automated Electron integration test chưa có.

Windows installer/release pipeline là bước riêng:

```text
Tagged/release commit
        ↓
Windows build runner
        ↓
electron-builder / NSIS
        ↓
Release channel
        ↓
Windows POS updater
```

Update app không được xóa local operational/cache database và không force restart giữa active session/bill.

## 21. Security/hardening còn mở

Không coi local CI xanh là production security sign-off. Trước remote/pilot phải xử lý/chốt:

1. Protect hoặc disable `/api/system/*` diagnostics khỏi public unauthenticated surface.
2. Chốt cross-Store policy cho cùng một `installationId`; hiện schema uniqueness là `(store_id, installation_id)`.
3. Thêm activation-token issuance/admin boundary; hiện mới có consume/verification flow.
4. Thêm recovery path có kiểm soát cho corrupted `credential.bin` / invalid installation identity; không tự regenerate identity im lặng.
5. Xem xét heartbeat/touch policy cho `devices.last_seen_at`.
6. Align TypeScript version giữa `@billiards/contracts` và Worker/Desktop.
7. Thêm automated Desktop security tests cho trusted URL, IPC sender và local credential state.
8. Review activation transaction invariant trước remote deployment; D1 batch rollback khi SQL statement fail nhưng application-level zero-change invariant vẫn phải được test rõ.

## 22. Quy tắc không phá vỡ

1. V1 không có branch.
2. Store = tenant/data isolation boundary.
3. D1 = control plane.
4. Store DO = operational single-writer boundary.
5. Renderer không có Node/Electron trực tiếp và không giữ device secret.
6. Device/Store/Auth/Permission context resolve/enforce server-side.
7. Client-supplied Store ID không phải routing/security authority.
8. Packaged Desktop không gửi credential qua HTTP plaintext.
9. Command semantics tồn tại từ M1.
10. Money không dùng floating-point.
11. Timer UI không phải nguồn sự thật của thời gian chơi.
12. Giá lịch sử không bị thay đổi bởi cấu hình giá mới.
13. Offline đến sau online vertical slice.
14. Mobile dùng chung contracts/commands, không fork business logic.
15. Production/pilot schema chỉ đổi qua migration được review.
16. Không chạy arbitrary script/code trong print template.
17. CI phải tiếp tục bảo vệ contracts + Worker + tests + Desktop build.

## 23. Thứ tự triển khai tiếp theo

```text
M0 Foundation ✅
      ↓
M1.1 Device identity + Store context ✅
      ↓
Post-M1.1 hardening
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

Không bắt đầu UI nghiệp vụ lớn trước khi request trust boundary của Device/Store/Auth/Permission đủ ổn định.