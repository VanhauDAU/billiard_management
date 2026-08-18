# Roadmap triển khai

Cập nhật: **2026-08-18**

Roadmap này dùng để quyết định **thứ tự implementation và gate đóng milestone**. Chi tiết trạng thái đã làm nằm ở [`PROGRESS.md`](PROGRESS.md); invariant kỹ thuật nằm ở [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Nguyên tắc lập kế hoạch

1. Security/trust boundary phải đi trước business mutation.
2. Làm online vertical slice hoàn chỉnh trước offline/sync.
3. Chỉ thêm Store DO schema khi vertical slice thật sự cần.
4. Business state authoritative nằm server-side/Store DO; UI timer/state không phải nguồn sự thật.
5. Mỗi milestone phải có automated regression test và `pnpm run ci` xanh.
6. Remote/pilot là release gate riêng, không đồng nghĩa với feature local đã xong.

## Trạng thái milestone

| Milestone | Mục tiêu | Trạng thái |
|---|---|---|
| M0 | Foundation/monorepo/Worker/D1/Store DO | ✅ Done |
| M1.1 | Device identity + trusted Store | ✅ Done |
| M1.2 | Employee PIN + AuthSession + AuthGate | ✅ Done |
| M1.3 | Permission Context | ✅ Done |
| M1.4 | TableType + BilliardTable | ⏭ Next |
| M1.5 | Pricing + Open TableSession | ⬜ Planned |
| M1.6 | Product + Bill + Payment + finalize | ⬜ Planned |
| M2 | Business completeness | ⬜ Planned |
| M3 | Printing 80mm | ⬜ Planned |
| M4 | Mobile PWA + realtime | ⬜ Planned |
| M5 | Offline/sync/takeover | ⬜ Planned |
| M6 | Reports + pilot | ⬜ Planned |

---

## M1.3 - Permission Context ✅

### Kết quả đã triển khai

Trust chain hiện tại:

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
requirePermission('...')
  ↓
business handler
```

Đã hoàn thành:

- shared `PermissionKey` allowlist/schema trong `@billiards/contracts`,
- regression test khóa contract allowlist khớp D1 `permission_catalog`,
- internal trusted `PermissionContext`,
- resolver đọc current Membership/Role/`role_permissions` từ D1,
- permission key lạ trong DB fail-closed,
- `requirePermission(permissionKey)`,
- `401` cho auth/current actor không còn hợp lệ,
- `403 permission_denied` cho actor đã auth nhưng thiếu capability,
- permission removal có hiệu lực ở request kế tiếp,
- role reassignment sau login có hiệu lực ở request kế tiếp,
- cross-Store isolation + client metadata spoof regression coverage,
- `GET /api/auth/permissions` trả capability snapshot an toàn cho client UX,
- Electron Main giữ Device/AuthSession secrets; IPC/Preload chỉ chuyển safe permission list,
- Renderer `PermissionGate` fail-closed nếu không xác minh được permission,
- `hasPermission(...)` ở Renderer chỉ là UX; Worker vẫn là authorization authority.

M1.3 không cần migration mới; sử dụng `permission_catalog` và `role_permissions` đã có từ control-plane migration 0001.

### Debt sau M1.3

- Renderer capability snapshot hiện refresh khi `PermissionGate` mount/retry; nếu permission thay đổi trong lúc UI đang mở thì UI có thể tạm stale, nhưng Worker enforce current permission ở request kế tiếp. Có thể bổ sung refresh-on-focus/403/realtime sau khi POS flow ổn định.
- `PermissionGate.tsx` và `AuthGate.tsx` cần formatter/refactor riêng; không chặn M1.4.
- Không business mutation nào được phép dựa vào Renderer `hasPermission(...)` làm security boundary.

---

## M1.4 - Table foundation ⏭

### Mục tiêu

Tạo lớp operational data đầu tiên trong Store Durable Object SQLite cho cấu hình bàn.

### Store DO migration

Tạo migration kế tiếp sau foundation version 1, tối thiểu cho:

```text
table_types
billiard_tables
```

Không đưa hai bảng này vào D1. D1 tiếp tục chỉ giữ control plane; table configuration là operational Store-scoped data và phải nằm trong Store DO tương ứng.

### Model đề xuất

`table_types`:

```text
id
name
status: active | disabled
sort_order
created_at
updated_at
```

`billiard_tables`:

```text
id
table_type_id
name
status: active | disabled
sort_order
created_at
updated_at
```

Tên/number uniqueness policy phải được khóa bằng schema + tests. Khuyến nghị V1 dùng một display `name` duy nhất trong Store, tránh cùng lúc có `number` và `name` nhưng semantics chưa rõ.

### Invariant

- ID/data chỉ tồn tại trong Store DO tương ứng.
- Table type là configurable data; không hard-code bàn lỗ/bàn líp vào domain branching.
- `billiard_tables.status` ở M1.4 chỉ mô tả lifecycle cấu hình (`active/disabled`).
- **Không persist `occupied` như trạng thái master của bàn ở M1.4.** Từ M1.5, trạng thái đang chơi phải được suy ra từ active `TableSession` để tránh hai nguồn sự thật.
- Không xóa cứng TableType/Table sau khi đã có lịch sử nghiệp vụ tham chiếu; disable là lifecycle mặc định.
- Không tạo pricing/session/product/bill schema sớm trong M1.4.

### API / permission

```text
table.view
  → list/read table types + tables cần cho POS

table.manage
  → create/update/disable table type + table
```

Worker phải đi theo thứ tự:

```text
requireDevice
→ requireAuthSession
→ requirePermission(...)
→ derive trusted storeId
→ route request tới STORE_DO.idFromName(storeId)
→ Store DO verify persisted store identity
→ operational query/mutation
```

Client không được truyền `storeId`, `actorId`, role hoặc permission làm authority.

### Work packages

#### M1.4-A - Store DO schema v2

- `migration-002-table-foundation.ts`,
- register migration theo sequence hiện có,
- constraints/indexes/foreign keys cần thiết,
- migration restart/idempotency behavior,
- schema-version compatibility tests.

#### M1.4-B - Contracts

- strict schemas/types cho TableType/BilliardTable,
- create/update request schemas không chứa trusted identity metadata,
- response schemas dùng chung Worker/Desktop.

#### M1.4-C - Store DO repository/service

- list/read/create/update/disable TableType,
- list/read/create/update/disable BilliardTable,
- transaction/constraint mapping rõ ràng,
- không để Worker/D1 giữ duplicate operational state.

#### M1.4-D - Worker routes + authorization

- `table.view` cho read path,
- `table.manage` cho management mutation,
- trusted Store routing,
- stable 4xx/5xx error mapping.

#### M1.4-E - Tests

Bắt buộc cover:

- migration v1 → v2,
- restart DO không làm hỏng schema/data,
- create/read/update/disable TableType,
- create/read/update/disable BilliardTable,
- table type reference constraint,
- uniqueness rule,
- Store A không đọc/ghi Store B,
- `table.view` granted/missing,
- `table.manage` granted/missing,
- client-supplied Store/Actor metadata không có tác dụng.

#### M1.4-F - Desktop table management/read smoke

Chỉ làm UI tối thiểu đủ chứng minh vertical path:

```text
Authenticated Employee
→ PermissionGate
→ list tables
→ owner/manager có table.manage thì quản lý cấu hình
```

Không mở bàn/timer ở M1.4.

### Gate đóng M1.4

- Store DO schema version mới migrate/restart an toàn,
- CRUD-like management dùng disable thay hard delete,
- Store isolation được automated-test,
- Worker authorization dùng `requirePermission`,
- Desktop list/table-management smoke chạy được,
- `pnpm run ci` xanh.

---

## M1.5 - Pricing + Open TableSession

### Pricing foundation

Chỉ triển khai rule đủ dùng cho V1 vertical slice trước, nhưng data model phải cho phép mở rộng.

Nguyên tắc:

- money integer VND,
- pricing config có version/snapshot semantics,
- config mới không làm thay đổi bill/session lịch sử.

### Open session

Command target:

```text
OpenTableSession
```

Server enrich:

```text
Store + Device + Actor + server execution time
```

### Invariant

- một bàn không có hai active session,
- `occupied`/`available` là derived operational state từ active session, không phải mutable master flag độc lập,
- open operation idempotent theo `commandId`,
- authoritative start time do server quyết định,
- operation atomic trong Store DO.

### Gate

- concurrency/idempotency tests,
- double-open rejected,
- restart DO không mất active state,
- permission `table.open`,
- CI xanh.

---

## M1.6 - Online POS vertical slice

### Product

- Category/Product.
- Product status active/disabled.
- Add item dùng price snapshot.

### Bill

- bill gắn active table session,
- bill items giữ immutable history fields cần thiết,
- V1 chưa discount/surcharge/split bill.

### Payment

```text
cash
bank_transfer
```

### Finalize

Một finalize transaction phải đảm bảo:

```text
payment accepted
  + bill closed
  + table session closed
  + derived table state becomes available
```

Không được có half-finalized state.

### Gate M1 online slice

```text
Login
→ permission
→ list tables
→ open table
→ timer/server state
→ add product
→ bill total
→ payment
→ close
→ table available
```

Luồng trên chạy end-to-end online và có automated domain/integration coverage.

---

## M2 - Business completeness

Sau vertical slice mới thêm:

- pricing rules nâng cao,
- time adjustment + permission + reason + audit,
- chuyển bàn,
- gộp bill,
- management UI cho role/permission,
- domain event/audit hoàn chỉnh,
- edge cases/recovery business state.

---

## M3 - Printing

Theo [`PRINTING_V1.md`](PRINTING_V1.md):

- 80mm,
- Main Process native print adapter,
- default template,
- allowlisted placeholder/block editor,
- preview cùng renderer semantics,
- QR payment,
- template version,
- idempotent print job + retry.

Release gate bắt buộc test trên Windows printer/driver thật.

---

## M4 - Mobile PWA + realtime

Chỉ bắt đầu khi Worker business API ổn định.

- Mobile không fork domain logic.
- Dùng cùng permission keys.
- Realtime state sync từ server/DO.
- Mobile là operational client, không chỉ viewer.

Trước M4 cần cleanup scaffold hiện tại: package identity, toolchain alignment, auth storage model cho browser/PWA.

---

## M5 - Offline / sync / takeover

Offline không phải “cache API response”. Cần một protocol riêng:

```text
Local SQLite replica
+ persistent command outbox
+ command idempotency
+ sync cursor
+ conflict policy
+ takeover policy
+ clock/boot-anchor policy
```

Chỉ thiết kế sau khi online command semantics ổn định.

---

## M6 - Reports + pilot

### Reports V1

- doanh thu hôm nay/theo ngày,
- tiền bàn/hàng hóa,
- lượt bàn/thời gian sử dụng,
- best-selling products,
- invoice history,
- cash/bank-transfer breakdown.

### Pilot release gate

Bắt buộc trước cửa hàng thật:

- remote D1 migrations reviewed,
- secret/config separation local/staging/prod,
- D1/DO backup-recovery/PITR procedure,
- minimum logs/metrics/error correlation,
- activation-token issuance/admin flow,
- Device reset/transfer/recovery flow,
- branch protection + required CI,
- Windows code signing/installer/update channel,
- packaged activation/restart/update smoke,
- printer smoke nếu M3 đã bật,
- rollback procedure.

---

## Cross-cutting technical debt

### P0 trước business mutation

- ✅ Permission Context đã hoàn thành.
- Mọi business route mới phải dùng trusted Store/Device/Actor + `requirePermission`.
- Command idempotency bắt buộc trước mutation như OpenTableSession; M1.4 configuration mutation phải có error/transaction semantics rõ ràng và không được tạo duplicate state.

### P0 trước remote/pilot

- Branch protection cho `main`: PR-only + required CI status.
- Activation-token issuance/admin flow.
- Device transfer/reset/installation repair.
- Remote migrations/secrets/observability/backup/restore.
- Signing/notarization/update channel + packaged Windows smoke.

### P1

- Align TypeScript versions giữa packages.
- Chuẩn hóa formatter/linter và đưa vào CI sau khi baseline sạch.
- Automated Electron integration/security tests.
- Split `AuthGate.tsx`; normalize `PermissionGate.tsx` formatting trước khi Renderer tiếp tục phình to.
- AuthSession pruning/concurrent-session policy.
- `devices.last_seen_at` heartbeat policy.
- Permission UX refresh strategy (focus/403/realtime) khi role-management UI được thêm.

### P2

- Mobile scaffold cleanup trước M4.
- Broader anti-abuse/rate-limit strategy khi threat model chuyển từ trusted-store deployment sang Internet-facing/public access.

## Quy tắc merge milestone

Một milestone chỉ được đánh ✅ khi:

1. implementation đúng trust/data boundary,
2. regression tests cover invariant chính,
3. docs được cập nhật cùng change-set,
4. `pnpm run ci` xanh,
5. manual smoke cần thiết cho native/Desktop path đã chạy,
6. PR mô tả rõ migration/security/rollback impact.

Nếu docs bị bỏ sót trong một feature PR đã merge, phải tạo follow-up docs PR trước khi bắt đầu milestone kế tiếp để trạng thái `main` không tiếp tục sai lệch.