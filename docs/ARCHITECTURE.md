# Kiến trúc hệ thống

Cập nhật: **2026-08-18**

> V1 không có mô hình `branch`. Một `Store` là một cửa hàng billiards tại một địa điểm vật lý và đồng thời là tenant/data-isolation boundary của hệ thống.

Scope nghiệp vụ đã khóa tại [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md). Quyết định single-store được ghi tại [`ADR-001-single-store-no-branch.md`](ADR-001-single-store-no-branch.md).

## 1. Trạng thái kiến trúc hiện tại

**M0 - Foundation đã hoàn thành.** Foundation hiện có:

- Electron desktop security/process boundary.
- Hono Worker gateway/API.
- D1 Store-based control plane.
- `STORE_DO` + SQLite-backed `StoreDurableObject`.
- Store identity guard.
- Store DO schema migration/versioning runner.
- Automated Store DO SQLite tests.
- Shared API/command contracts.
- GitHub Actions CI quality gate.

Dự án bắt đầu **M1 - Windows POS online**, trước tiên là Device identity + Store execution context.

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

Dữ liệu của Store A không được đọc/ghi nhầm sang Store B.

Nếu sau này hỗ trợ chuỗi nhiều địa điểm, đó là capability mới. Không giữ branch trong V1 chỉ để dự phòng.

## 5. Desktop process boundary

```text
Renderer (React)
      │
      │ window.desktopApi
      ▼
Preload
      │
      │ typed IPC
      ▼
Main Process
      │
      ├── HTTP/backend client
      ├── future local SQLite
      ├── printing
      ├── sync/outbox
      ├── updater
      └── secure storage
```

Nguyên tắc:

- Renderer không có Node integration.
- Renderer không expose `ipcRenderer` trực tiếp.
- Preload chỉ expose API hẹp, typed.
- Main process quản lý network orchestration, local storage, printing và updater.
- Navigation/open-external được kiểm soát ở main process.

## 6. D1 Control Plane - model hiện tại

Migration `apps/worker/migrations/0001_init_control_plane.sql` hiện đã là Store-based schema.

Các bảng foundation:

```text
stores
users
roles
permission_catalog
role_permissions
store_memberships
devices
auth_sessions
store_registry
```

### `stores`

Metadata của cửa hàng gồm các trường foundation như:

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

`permission_catalog` là capability allowlist do hệ thống quản lý. Owner có thể gán các capability hợp lệ cho role, không tự phát minh security permission key tùy ý.

Một user có một membership/role trong Store ở V1. Permission được kiểm tra server-side; UI chỉ ẩn/disable để hỗ trợ trải nghiệm, không phải security boundary duy nhất.

### Device

Mỗi thiết bị thuộc một Store.

`devices` lưu installation identity, loại thiết bị, platform, trạng thái, app version và last-seen metadata phù hợp.

Desktop và Mobile đều là client của Store; Mobile không phải branch riêng.

### Auth session

Session foundation gắn với:

```text
store + user + membership + device
```

Không lưu raw session token; D1 lưu hash.

PIN credential chưa nằm trong migration 0001. PIN hashing, pepper, rate limiting và lockout sẽ được thiết kế cùng AuthGate trong M1.

### Store registry

`store_registry` map Store tới durable object key/provisioning metadata và schema metadata control-plane.

Operational schema version thật của Store DO vẫn được quản lý trong chính SQLite của Store DO qua `system_metadata`.

## 7. M1 request trust boundary

Bước M1 đầu tiên phải xây Device + Store execution context:

```text
Desktop request
      │
      │ device identity
      ▼
Cloudflare Worker
      │
      ├── lookup D1 devices
      ├── kiểm tra device status
      ├── resolve Store từ dữ liệu server-side
      └── tạo execution context
              │
              ▼
       StoreDurableObject
```

Guardrail:

- Client không được tự gửi `storeId` và được tin mặc định cho mutation.
- Worker phải resolve Store context từ device/session server-side state.
- Request không có device hợp lệ phải fail-closed.
- Employee/auth/permission context sẽ được gắn tiếp vào execution context này.

## 8. Store Durable Object - operational data plane

Flow hiện tại:

```text
storeId
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

Automated tests hiện bao phủ:

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
- desktop/mobile không ghi trực tiếp vào database,
- dễ cô lập dữ liệu giữa các Store.

## 9. Operational entities dự kiến

SQLite trong Store DO sẽ tiến hóa theo migration riêng, dự kiến gồm:

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

Đây là target domain map. **Không tạo tất cả trong migration foundation.** Từng nhóm entity chỉ được thêm khi vertical slice cần và có test/migration tương ứng.

## 10. Loại bàn là dữ liệu cấu hình

Không dùng enum cứng cho `bàn líp`, `bàn lỗ`, ...

`table_types` cho phép Owner tự tạo loại bàn và gắn pricing policy phù hợp.

Một bàn cụ thể tham chiếu `table_type_id` và có thể có override cấu hình nếu V1 pricing cần.

## 11. Pricing

Pricing không hard-code một mức giá duy nhất.

Target cho phép biểu diễn:

- base hourly rate theo loại bàn,
- time band,
- ngày/nhóm ngày,
- optional per-table override,
- rounding/time policy.

Khi phiên bắt đầu/được tính tiền, phải lưu đủ policy/version/snapshot cần thiết để thay đổi giá tương lai không làm sai lịch sử.

Money lưu bằng integer minor/unit phù hợp với VND, không dùng floating-point cho tiền.

## 12. Session, bill và time adjustment

`TableSession` là nguồn sự thật cho thời gian chơi; timer UI chỉ là cách hiển thị.

Điều chỉnh thời gian:

- cần permission,
- lý do bắt buộc,
- actor bắt buộc,
- audit delta hoặc before/after.

Bill V1 gồm tiền bàn + sản phẩm, chưa có discount/surcharge.

Giá sản phẩm phải snapshot vào bill item tại thời điểm bán.

## 13. Chuyển bàn và gộp bill

V1 có:

- chuyển bàn,
- gộp bill.

V1 không có tách bill.

Hai nghiệp vụ này phải đi qua command transaction, có audit và state transition rõ; không thực hiện bằng thao tác copy/delete ad-hoc.

## 14. Thanh toán

Phương thức V1:

- cash,
- bank_transfer.

Payment completion phải transactionally finalize bill/session theo rule nghiệp vụ và trả bàn về trạng thái phù hợp.

QR thanh toán là rendering concern dựa trên cấu hình chuyển khoản của Store; không phải một payment method thứ ba.

## 15. Printing boundary

Printing chạy main-side trên desktop.

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

Mọi mutation nghiệp vụ từ M1 đi qua command semantics:

```text
Client intent
   ↓
CommandEnvelope
   ↓
Worker auth/permission boundary
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

Shared `CommandEnvelope` foundation đã tồn tại trong `@billiards/contracts`. Business-specific commands sẽ được thêm theo vertical slice.

Không triển khai full event sourcing.

Current state vẫn materialize trong SQLite; events phục vụ audit/realtime/sync/integration.

## 17. Shared packages

### `packages/contracts`

Hiện đã có contract thật cho:

- API health response,
- `CommandEnvelope`.

Tiếp tục mở rộng bằng runtime validation schemas, request/response contracts và business command/event contracts khi M1 triển khai.

### `packages/domain`

Hiện vẫn là scaffold foundation. Từ M1 sẽ chứa:

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

Business rule không được duplicate riêng trong mobile.

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

Windows installer/release pipeline là bước riêng sau này:

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

## 21. Quy tắc không phá vỡ

1. V1 không có branch.
2. Store = tenant/data isolation boundary.
3. D1 = control plane.
4. Store DO = operational single-writer boundary.
5. Renderer không có Node/Electron trực tiếp.
6. Device/Store/Auth/Permission context phải được resolve/enforce server-side.
7. Command semantics tồn tại từ M1.
8. Money không dùng floating-point.
9. Timer UI không phải nguồn sự thật của thời gian chơi.
10. Giá lịch sử không bị thay đổi bởi cấu hình giá mới.
11. Offline đến sau online vertical slice.
12. Mobile dùng chung contracts/commands, không fork business logic.
13. Production/pilot schema chỉ đổi qua migration được review.
14. Không chạy arbitrary script/code trong print template.
15. CI phải tiếp tục bảo vệ contracts + Worker + tests + Desktop build trên thay đổi mới.

## 22. Thứ tự triển khai tiếp theo

```text
M0 Foundation ✅
      ↓
M1.1 Device identity + Store context
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