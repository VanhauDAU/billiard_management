# Billiard Management

Hệ thống quản lý cửa hàng billiards theo kiến trúc hybrid:

- **Desktop POS:** Electron + React + TypeScript, ưu tiên Windows khi triển khai cửa hàng.
- **Mobile:** React/Vite PWA, triển khai ở milestone sau.
- **API/Gateway:** Cloudflare Workers + Hono.
- **Control plane:** Cloudflare D1.
- **Operational data plane:** một SQLite-backed Durable Object cho mỗi chi nhánh (đang ở bước tiếp theo).
- **Local/offline POS:** SQLite replica + sync/outbox sẽ triển khai ở milestone offline, chưa làm ở M0.

## Trạng thái hiện tại

Dự án đang ở **M0 - Foundation**.

Đã hoàn thành:

- pnpm monorepo.
- Electron main/preload/renderer boundary.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Typed IPC cho desktop.
- Desktop gọi được Worker local.
- Hono Worker chạy local ổn định ở port `8787`.
- D1 `billiards-control-plane` và binding `DB`.
- Migration `0001_init_control_plane.sql`.
- Control-plane schema: tenant, branch, user, membership, device, auth session, branch registry.
- `/api/health` và `/api/system/db-health`.
- Worker type generation và TypeScript typecheck.

Chưa hoàn thành M0:

- Shared API contracts thực tế trong `packages/contracts`.
- Domain primitives thực tế trong `packages/domain`.
- Branch Durable Object + SQLite health/transaction spike.
- CI tự động typecheck/build.
- Harden một số cross-table invariants của auth session trước khi apply migration đầu tiên lên D1 remote.

Xem tiến độ chi tiết tại [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Kiến trúc

```text
Windows Desktop POS                  Mobile PWA (sau)
Electron + React                    React + Vite
        │                                │
        └──────────────┬─────────────────┘
                       ▼
              Cloudflare Worker
                  Hono API
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
      D1 control plane       Branch Durable Object
 tenant/user/branch/device     1 object / branch
          │                    SQLite operational DB
          │                         │
          │                  tables/bills/sessions/
          │                  products/payments/events
          └────────────┬────────────┘
                       ▼
                 Sync / realtime
```

Chi tiết quyết định kiến trúc: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Cấu trúc repository

```text
billiard_management/
├── apps/
│   ├── desktop/       # Electron POS
│   ├── mobile/        # PWA scaffold, chưa phát triển ở M0
│   └── worker/        # Hono + Cloudflare Worker + D1
├── packages/
│   ├── contracts/     # Shared commands/events/API schemas
│   ├── domain/        # Pure business rules
│   └── shared/        # Pure utilities
├── docs/
├── package.json
└── pnpm-workspace.yaml
```

## Chạy local

Yêu cầu chính:

- Node.js phù hợp với toolchain hiện tại.
- pnpm 11.x.
- Cloudflare Wrangler đã được cài qua workspace.

Cài dependencies:

```bash
pnpm install
```

Terminal 1 - Worker:

```bash
pnpm dev:worker
```

Worker local được cố định tại:

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

Apply migrations vào D1 local:

```bash
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
```

Kiểm tra foreign keys:

```bash
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

Không apply `--remote` chỉ để thử nghiệm. Migration remote chỉ chạy khi schema đã được review và chốt.

## Nguyên tắc kiến trúc

- D1 là **control plane**, không chứa bảng/bill/product/payment vận hành.
- Operational state của mỗi chi nhánh sẽ thuộc **Branch Durable Object**.
- Renderer không được truy cập Node/Electron trực tiếp; chỉ dùng API hẹp do preload expose.
- Không lưu raw session token.
- PIN credential/rate limiting được thiết kế cùng AuthGate, không thêm tùy tiện vào `users`.
- Command semantics được thiết kế từ đầu; persistent offline outbox triển khai ở milestone offline.
- Mobile không được kéo tiến độ M0/M1; chỉ phát triển khi desktop online vertical slice ổn định.

## Bước tiếp theo

Bước kỹ thuật tiếp theo là **Branch Durable Object spike**:

1. `BRANCH_DO` binding.
2. `BranchDurableObject` class.
3. `idFromName(branchId)` để bảo đảm một DO cho mỗi branch.
4. SQLite `system_metadata` trong DO.
5. Health endpoint Worker → DO → SQLite.
6. Transaction smoke test.

Sau khi spike này pass mới xây `CommandEnvelope`, `ProcessedCommand`, `DomainEvent`, rồi mới bắt đầu vertical slice POS đầu tiên.
