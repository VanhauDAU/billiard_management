# Tiến độ phát triển

Cập nhật: **2026-08-18**

## Tổng quan

Dự án đang ở **M0 - Foundation**. Phần nền desktop → Worker → D1 đã hoạt động. M0 chưa được xem là hoàn thành cho đến khi có Branch Durable Object spike, shared contracts tối thiểu và CI kiểm tra tự động.

Ước lượng hiện tại:

- **M0 Foundation:** khoảng **75%**.
- **M1 Windows POS online:** chưa bắt đầu nghiệp vụ thật.
- **Toàn bộ MVP đến pilot:** khoảng **10-15%** theo khối lượng, vì phần khó nhất vẫn là command model, nghiệp vụ bill/table/pricing, printing, realtime và offline/sync.

Các tỷ lệ trên là chỉ báo tiến độ kỹ thuật, không phải cam kết thời gian.

## M0 - Foundation

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| pnpm monorepo | ✅ Done | `apps/*`, `packages/*` |
| Desktop Electron scaffold | ✅ Done | React + TypeScript + electron-vite |
| Electron security boundary | ✅ Done | context isolation, sandbox, narrow preload API |
| Typed IPC | ✅ Done | app version + backend health |
| Worker/Hono local | ✅ Done | port 8787 |
| Desktop → Worker HTTP | ✅ Done | main process quản lý request |
| D1 database + binding | ✅ Done | `billiards-control-plane`, binding `DB` |
| D1 migration system | ✅ Done | `0001_init_control_plane.sql` |
| Control-plane schema local | ✅ Done | tenant/branch/user/membership/device/session/registry |
| Local FK validation | ✅ Done | `PRAGMA foreign_key_check` đã pass trong quá trình setup |
| Worker → D1 health query | ✅ Done | `/api/system/db-health` |
| Worker TypeScript typecheck | ✅ Done | local `typescript` + `cf-typegen` |
| Shared contracts | 🟡 Scaffold | package tồn tại nhưng chưa có contract thật |
| Domain package | 🟡 Scaffold | package tồn tại nhưng chưa có business primitive thật |
| Branch Durable Object | ⬜ Next | SQLite-backed DO / branch |
| DO transaction smoke test | ⬜ Next | bắt buộc trước command infrastructure |
| CI | ⬜ Pending | typecheck/build trên push/PR |
| Remote D1 migration | ⬜ Pending | chỉ sau khi review migration 0001 |

### Gate để đóng M0

M0 chỉ được đánh dấu hoàn thành khi đạt toàn bộ:

- `pnpm` install sạch từ clone mới.
- Desktop typecheck/build pass.
- Worker typecheck pass.
- Worker health pass.
- D1 health pass.
- Branch DO health pass.
- Branch DO SQLite read/write + transaction smoke test pass.
- Shared health/command envelope contract đầu tiên nằm trong `packages/contracts`.
- CI chạy tối thiểu desktop typecheck/build và worker typecheck.

## Review migration 0001 trước remote

Migration hiện tại phù hợp với mục tiêu control-plane, nhưng trước lần apply remote đầu tiên cần harden thêm tính nhất quán của `auth_sessions`.

Hiện các foreign key đảm bảo session trỏ tới các entity cùng tenant, nhưng chưa ép database rằng:

- `membership_id` thực sự thuộc đúng `branch_id` và `user_id` của session.
- `device_id` thực sự thuộc đúng `branch_id` của session.

Trước remote migration nên chọn một trong hai hướng:

1. **Ưu tiên:** thêm composite unique keys + composite foreign keys để database enforce các invariant này.
2. Hoặc ghi rõ invariant được enforce ở application layer và có integration test bắt buộc.

Vì migration `0001` chưa nên coi là immutable trước khi apply remote production/pilot, đây là thời điểm phù hợp để sửa.

Ngoài ra, `updated_at` hiện dùng `DEFAULT CURRENT_TIMESTAMP`; SQLite/D1 không tự thay đổi giá trị này khi UPDATE. Repository/service layer sau này phải cập nhật `updated_at` rõ ràng.

## M1 - Windows POS online

Chỉ bắt đầu sau khi M0 đóng.

Vertical slice mục tiêu:

```text
Login
  ↓
Branch context
  ↓
Danh sách bàn
  ↓
Mở bàn
  ↓
Thêm sản phẩm
  ↓
Tính tiền
  ↓
Thanh toán tiền mặt
```

M1 phải dùng command semantics ngay từ đầu, dù persistent offline outbox chưa triển khai.

## M2 - Business completeness

Dự kiến gồm:

- pricing segments / giờ chơi,
- điều chỉnh thời gian,
- chuyển/gộp nghiệp vụ cần thiết,
- catalog sản phẩm/danh mục,
- bill lifecycle đầy đủ,
- permissions/roles thực tế,
- audit/domain events cần thiết.

## M3 - Printing

- Windows print agent.
- Driver/spooler integration.
- Template cố định/parameterized cho MVP.
- Retry/idempotency cho print job.

Không xây drag-drop print designer ở MVP.

## M4 - Mobile PWA + realtime

- PWA quản lý trên điện thoại.
- Shared contracts với desktop.
- Realtime branch state qua Worker/DO.
- Không để mobile trở thành nguồn write logic riêng biệt.

## M5 - Offline/sync/takeover

- Desktop local SQLite replica.
- Persistent command outbox.
- Sync protocol.
- Conflict/takeover rules.
- Clock/boot-anchor handling.
- Recovery sau crash/network loss.

## M6 - Report + pilot

- Báo cáo vận hành cần thiết.
- Backup/restore checks.
- Pilot tại cửa hàng thật.
- Telemetry/observability tối thiểu.
- Windows installer/update channel.

## Việc tiếp theo

Thứ tự khuyến nghị:

1. Review và harden migration `0001` trước remote.
2. Tạo Branch Durable Object spike.
3. Tạo shared system-health/command contracts.
4. Thêm CI.
5. Đóng M0.
6. Bắt đầu M1 vertical slice.
