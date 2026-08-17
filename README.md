# Billiard Management

Hệ thống quản lý cửa hàng billiards theo kiến trúc hybrid.

## Scope đã chốt

- **Một Store = một cửa hàng vật lý.**
- V1 **không có branch/chi nhánh**.
- Desktop POS: Electron + React + TypeScript, ưu tiên Windows khi triển khai.
- Mobile PWA: về sau thao tác đầy đủ như POS theo permission.
- API/Gateway: Cloudflare Workers + Hono.
- Control plane: Cloudflare D1.
- Operational data plane mục tiêu: một SQLite-backed **Store Durable Object** cho mỗi Store.
- Offline local SQLite + sync/outbox triển khai sau online vertical slice.

Scope nghiệp vụ chi tiết: [`docs/SYSTEM_SCOPE_V1.md`](docs/SYSTEM_SCOPE_V1.md).

## Nghiệp vụ V1 chính

- Nhân viên + PIN login.
- Role/permission cấu hình linh hoạt bởi Owner.
- Loại bàn cấu hình: bàn líp, bàn lỗ, ...
- Pricing cấu hình linh hoạt.
- Mở bàn, tính giờ, điều chỉnh thời gian có audit.
- Danh mục/sản phẩm; V1 chưa có tồn kho.
- Thêm sản phẩm vào bàn và snapshot giá bán.
- Bill không có discount/surcharge ở V1 hiện tại.
- Thanh toán tiền mặt/chuyển khoản.
- Chuyển bàn.
- Gộp bill.
- Không tách bill trong V1.
- In hóa đơn 80mm với template/placeholder editor + preview.
- Mobile full operation theo permission ở milestone sau.
- Báo cáo doanh thu/bàn/sản phẩm/hóa đơn/payment-method theo scope đã chốt.

## Trạng thái hiện tại

Dự án đang ở **M0 - Foundation**, khoảng **65%** sau khi thay đổi kiến trúc từ Branch sang Store.

Đã hoàn thành nền tảng:

- pnpm monorepo.
- Electron main/preload/renderer boundary.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Typed IPC.
- Desktop gọi Worker local.
- Hono Worker local port `8787`.
- D1 database + binding `DB`.
- Wrangler migration tooling.
- `/api/health` và `/api/system/db-health`.
- Worker type generation + TypeScript typecheck.

Cần refactor ngay:

- `0001_init_control_plane.sql` hiện vẫn còn branch model và **không được apply remote**.
- Target mới bỏ `branches`, `branch_id`, `branch_registry`.
- Sau đó mới làm `StoreDurableObject`.

Xem tiến độ: [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Kiến trúc mục tiêu

```text
Windows Desktop POS                  Mobile PWA
Electron + React                    React + Vite
        │                                │
        └──────────────┬─────────────────┘
                       ▼
              Cloudflare Worker
                  Hono API
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
      D1 control plane        Store Durable Object
 store/user/role/device         1 object / Store
 auth/session/registry          SQLite operational DB
          │                         │
          │                tables/pricing/sessions/
          │                products/bills/payments/
          │                commands/events/templates
          └────────────┬────────────┘
                       ▼
                 Sync / realtime
```

Chi tiết: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Cấu trúc repository

```text
billiard_management/
├── apps/
│   ├── desktop/       # Electron POS
│   ├── mobile/        # PWA scaffold
│   └── worker/        # Hono + Cloudflare Worker + D1
├── packages/
│   ├── contracts/     # Shared commands/events/API schemas
│   ├── domain/        # Pure business rules
│   └── shared/        # Pure utilities
├── docs/
│   ├── SYSTEM_SCOPE_V1.md
│   ├── ARCHITECTURE.md
│   └── PROGRESS.md
├── package.json
└── pnpm-workspace.yaml
```

## Chạy local

Cài dependencies:

```bash
pnpm install
```

Terminal 1 - Worker:

```bash
pnpm dev:worker
```

Worker local:

```text
http://localhost:8787
```

Kiểm tra API:

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/api/system/db-health
```

Terminal 2 - Desktop:

```bash
pnpm dev:desktop
```

## Typecheck / build

Desktop:

```bash
pnpm typecheck:desktop
pnpm build:desktop
```

Worker:

```bash
pnpm --dir apps/worker run cf-typegen
pnpm --dir apps/worker run typecheck
```

## D1 local development

> Migration `0001` hiện phải được rewrite theo Store model trước khi apply lại.

Sau khi rewrite:

```bash
rm -rf apps/worker/.wrangler/state
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

**Không chạy `--remote` cho migration branch-based hiện tại.**

## Nguyên tắc kiến trúc

- Store = tenant/data isolation boundary.
- V1 không có branch.
- D1 là control plane.
- Store DO là operational single-writer boundary.
- Renderer không truy cập Node/Electron trực tiếp.
- Permission enforce server-side.
- Không lưu raw session token.
- PIN/rate-limit/lockout thiết kế cùng AuthGate.
- Loại bàn và pricing là dữ liệu cấu hình, không hard-code.
- Timer UI không phải nguồn sự thật của thời gian chơi.
- Money không dùng floating-point.
- Giá lịch sử không đổi theo cấu hình mới.
- Command semantics tồn tại từ M1; offline persistence làm sau.
- Print template chỉ dùng allowlisted placeholder/block, không arbitrary script/code.

## Bước tiếp theo

1. Rewrite `0001_init_control_plane.sql` theo Store model.
2. Reset/test D1 local.
3. Tạo `STORE_DO` + `StoreDurableObject` SQLite spike.
4. Tạo shared contracts đầu tiên.
5. Thêm CI.
6. Đóng M0 và bắt đầu M1 vertical slice.
