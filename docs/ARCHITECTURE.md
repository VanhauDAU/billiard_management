# Kiến trúc hệ thống

Cập nhật: **2026-08-18**

> Quyết định mới: V1 không còn mô hình `branch`. Một `Store` là một cửa hàng billiards tại một địa điểm vật lý và đồng thời là tenant boundary của hệ thống.

Scope nghiệp vụ đã khóa tại [`SYSTEM_SCOPE_V1.md`](SYSTEM_SCOPE_V1.md).

## 1. Mục tiêu

Hệ thống phải đáp ứng:

- POS desktop chạy ổn định tại cửa hàng, ưu tiên Windows khi triển khai.
- Mobile PWA có thể thao tác đầy đủ như POS ở milestone sau.
- Backend cloud để xác thực, quản lý Store/user/device và đồng bộ.
- Operational state có single-writer boundary rõ ràng.
- Có đường tiến hóa tới offline-first mà không viết lại command semantics.
- Có printing 80mm và remote desktop update ở các milestone sau.

## 2. Sơ đồ tổng thể mới

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

Không còn:

- `branches`,
- `branch_id`,
- `branch_registry`,
- `BRANCH_DO`,
- `BranchDurableObject`,
- chọn/chuyển branch trong UI.

## 3. Store là tenant boundary

Một Store = một cửa hàng vật lý.

Trong UI/domain dùng từ `Store` / `Cửa hàng`. Có thể xem Store là tenant kỹ thuật, nhưng không cần expose khái niệm tenant cho người dùng cuối.

Dữ liệu của Store A không được đọc/ghi nhầm sang Store B.

Nếu sau này hỗ trợ chuỗi nhiều địa điểm, đó là capability mới. Không giữ branch trong V1 chỉ để dự phòng.

## 4. Desktop process boundary

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

## 5. D1 Control Plane - target model

Migration hiện tại vẫn chứa branch và sẽ được refactor trước remote.

Target D1 mới:

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

### `stores`

Metadata của cửa hàng:

- tên,
- slug/code,
- địa chỉ,
- số điện thoại,
- timezone,
- locale,
- currency,
- trạng thái,
- cấu hình thông tin nhận chuyển khoản/QR ở mức phù hợp.

### User / membership / permission

Các role mặc định có thể gồm Owner/Manager/Cashier/Staff nhưng permission model không hard-code theo bốn tên này.

Owner có thể cấu hình role/permission linh hoạt trong phạm vi capability allowlist của hệ thống.

Permission được kiểm tra server-side; UI chỉ ẩn/disable để hỗ trợ trải nghiệm, không phải security boundary duy nhất.

### Device

Mỗi thiết bị thuộc một Store.

Desktop và Mobile đều là client của Store; Mobile không phải branch riêng.

### Auth session

Session gắn tối thiểu với:

```text
store + user + membership/role context + device
```

Không lưu raw session token.

PIN credential được thiết kế cùng AuthGate, rate limiting và lockout; không nhét tùy tiện vào `users`.

### Store registry

Dùng để map Store tới operational data-plane identity nếu cần metadata/provisioning state cho `STORE_DO`.

## 6. Store Durable Object - operational data plane

Target:

```text
storeId
  ↓
STORE_DO.idFromName(storeId)
  ↓
StoreDurableObject
  ↓
SQLite operational database
```

Một Store có đúng một operational single-writer boundary.

Lợi ích:

- transaction cục bộ cho table/session/bill/payment,
- command idempotency rõ,
- realtime connection có điểm hội tụ,
- desktop/mobile không ghi trực tiếp vào database,
- dễ cô lập dữ liệu giữa các Store.

Trước nghiệp vụ thật, DO phải pass spike:

- initialize SQLite schema,
- read/write metadata,
- Store identity không lẫn giữa hai DO,
- transaction commit/rollback smoke test.

## 7. Operational entities dự kiến

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

Đây là target domain map, không có nghĩa tất cả được tạo ngay trong migration đầu tiên của DO.

## 8. Loại bàn là dữ liệu cấu hình

Không dùng enum cứng cho `bàn líp`, `bàn lỗ`, ...

`table_types` cho phép Owner tự tạo loại bàn và gắn pricing policy phù hợp.

Một bàn cụ thể tham chiếu `table_type_id` và có thể có override cấu hình nếu V1 pricing cần.

## 9. Pricing

Pricing không hard-code một mức giá duy nhất.

Target cho phép biểu diễn:

- base hourly rate theo loại bàn,
- time band,
- ngày/nhóm ngày,
- optional per-table override,
- rounding/time policy.

Khi phiên bắt đầu/được tính tiền, phải lưu đủ policy/version/snapshot cần thiết để thay đổi giá tương lai không làm sai lịch sử.

Money lưu bằng integer minor/unit phù hợp với VND, không dùng floating-point cho tiền.

## 10. Session, bill và time adjustment

`TableSession` là nguồn sự thật cho thời gian chơi; timer UI chỉ là cách hiển thị.

Điều chỉnh thời gian:

- cần permission,
- lý do bắt buộc,
- actor bắt buộc,
- audit delta hoặc before/after.

Bill V1 gồm tiền bàn + sản phẩm, chưa có discount/surcharge.

Giá sản phẩm phải snapshot vào bill item tại thời điểm bán.

## 11. Chuyển bàn và gộp bill

V1 có:

- chuyển bàn,
- gộp bill.

V1 không có tách bill.

Hai nghiệp vụ này phải đi qua command transaction, có audit và state transition rõ; không thực hiện bằng thao tác copy/delete ad-hoc.

## 12. Thanh toán

Phương thức V1:

- cash,
- bank_transfer.

Payment completion phải transactionally finalize bill/session theo rule nghiệp vụ và trả bàn về trạng thái phù hợp.

QR thanh toán là rendering concern dựa trên cấu hình chuyển khoản của Store; không phải một payment method thứ ba.

## 13. Printing boundary

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

## 14. Command model

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

Không triển khai full event sourcing.

Current state vẫn materialize trong SQLite; events phục vụ audit/realtime/sync/integration.

## 15. Shared packages

### `packages/contracts`

- API request/response schemas,
- command/event envelopes,
- runtime validation schema,
- shared union/enum contract.

### `packages/domain`

- money/time primitives,
- pricing,
- table/session/bill state transitions,
- transfer/merge rules,
- pure validation.

### `packages/shared`

Chỉ chứa utility thật sự generic.

## 16. Mobile PWA

Mobile sau này thao tác đầy đủ như POS theo permission:

- xem/mở bàn,
- thêm món,
- chuyển bàn,
- gộp bill,
- thanh toán,
- xem hóa đơn/báo cáo,
- quản lý phần được cấp quyền.

Business rule không được duplicate riêng trong mobile.

## 17. Offline boundary

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

## 18. Update boundary

```text
Mac/dev
  ↓
GitHub
  ↓
CI Windows runner
  ↓
electron-builder / NSIS
  ↓
Release channel
  ↓
Windows POS updater
```

Update app không được xóa local operational/cache database và không force restart giữa active session/bill.

## 19. Quy tắc không phá vỡ

1. V1 không có branch.
2. Store = tenant/data isolation boundary.
3. D1 = control plane.
4. Store DO = operational single-writer boundary.
5. Renderer không có Node/Electron trực tiếp.
6. Permission được enforce server-side.
7. Command semantics tồn tại từ M1.
8. Money không dùng floating-point.
9. Timer UI không phải nguồn sự thật của thời gian chơi.
10. Giá lịch sử không bị thay đổi bởi cấu hình giá mới.
11. Offline đến sau online vertical slice.
12. Mobile dùng chung contracts/commands, không fork business logic.
13. Production/pilot schema chỉ đổi qua migration được review.
14. Không chạy arbitrary script/code trong print template.
