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
| M1.3 | Permission Context | ⏭ Next |
| M1.4 | TableType + BilliardTable | ⬜ Planned |
| M1.5 | Pricing + Open TableSession | ⬜ Planned |
| M1.6 | Product + Bill + Payment + finalize | ⬜ Planned |
| M2 | Business completeness | ⬜ Planned |
| M3 | Printing 80mm | ⬜ Planned |
| M4 | Mobile PWA + realtime | ⬜ Planned |
| M5 | Offline/sync/takeover | ⬜ Planned |
| M6 | Reports + pilot | ⬜ Planned |

---

## M1.3 - Permission Context

### Mục tiêu

Từ trusted `AuthContext`, Worker xác định chính xác actor được phép làm gì.

### Thiết kế

```text
requireDevice
  ↓
requireAuthSession
  ↓
AuthContext
  ↓
permission resolver
  ↓
PermissionContext
  ↓
requirePermission('...')
  ↓
business handler
```

### Work packages

#### M1.3-A - Permission contracts

- Permission key schema/type lấy từ system catalog allowlist.
- Không cho client tự invent capability key.
- Internal `PermissionContext` chứa trusted identity + resolved permission set.

#### M1.3-B - Resolver

- Query `role_permissions` theo `AuthContext.storeId + roleId`.
- Re-check current membership/role status.
- Absence = deny.
- Role thay đổi phải có hiệu lực ở request kế tiếp.

#### M1.3-C - Enforcement

- `requirePermission(permissionKey)` middleware/helper.
- 401 dành cho auth invalid; 403 dành cho actor đã auth nhưng thiếu permission.
- Không trả permission authority từ request body/header.

#### M1.3-D - Tests

Bắt buộc cover:

- granted permission → pass,
- missing permission → 403,
- cross-Store role/permission spoof → fail,
- role disabled → fail,
- membership suspended/revoked → fail,
- role assignment đổi sau login → authorize theo role hiện hành,
- client-supplied actor/permission metadata không có tác dụng.

### Gate đóng M1.3

- Có ít nhất một protected integration route/test đi qua full Device → Auth → Permission chain.
- Không business mutation nào bypass `requirePermission`.
- `pnpm run ci` xanh.

---

## M1.4 - Table foundation

### Schema Store DO

Tạo migration tối thiểu cho:

```text
table_types
billiard_tables
```

### Invariant

- ID/data chỉ tồn tại trong Store DO tương ứng.
- Table type là configurable data.
- Không hard-code bàn lỗ/bàn líp vào domain branching.
- Table name/number uniqueness policy phải chốt rõ.
- Không xóa cứng entity đã được lịch sử nghiệp vụ tham chiếu; dùng status/disable policy nếu cần.

### API/permission dự kiến

```text
table.view
table.manage
```

### Gate

- create/read/update/disable table/type,
- Store isolation test,
- permission test,
- migration rollback/restart compatibility,
- CI xanh.

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
- bill items immutable history fields cần thiết,
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
  + table available
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

luồng trên chạy end-to-end online và có automated domain/integration coverage.

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

### P0

- Permission Context trước business mutation.
- Branch protection trước remote/pilot.
- Release/update security trước phân phối installer thật.

### P1

- Align TypeScript versions giữa packages.
- Chuẩn hóa formatter/linter và đưa vào CI sau khi baseline sạch.
- Automated Electron integration/security tests.
- Split `AuthGate.tsx` trước khi tiếp tục mở rộng UI.
- AuthSession pruning/concurrent-session policy.
- `devices.last_seen_at` heartbeat policy.

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
