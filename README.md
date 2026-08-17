# Billiard Management

Hệ thống quản lý cửa hàng billiards theo kiến trúc hybrid, ưu tiên POS desktop Windows và mở rộng Mobile PWA sau khi online vertical slice ổn định.

## Scope đã chốt

- **Một Store = một cửa hàng vật lý.**
- V1 **không có branch/chi nhánh**.
- Desktop POS: Electron + React + TypeScript, ưu tiên Windows khi triển khai.
- Mobile PWA: về sau thao tác đầy đủ như POS theo permission.
- API/Gateway: Cloudflare Workers + Hono.
- Control plane: Cloudflare D1.
- Operational data plane: một SQLite-backed **Store Durable Object** cho mỗi Store.
- Offline local SQLite + sync/outbox triển khai sau online vertical slice.

Scope nghiệp vụ chi tiết: [`docs/SYSTEM_SCOPE_V1.md`](docs/SYSTEM_SCOPE_V1.md).

## Trạng thái hiện tại

**M0 - Foundation đã hoàn thành.** Dự án bắt đầu **M1 - Windows POS online**.

Foundation hiện có:

- pnpm monorepo.
- Electron main/preload/renderer boundary.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Typed IPC.
- Desktop gọi Worker qua main process.
- Hono Worker local port `8787`.
- D1 database + binding `DB`.
- Store-based migration `0001_init_control_plane.sql`.
- Store = tenant/data-isolation boundary; không còn branch model trong schema hiện hành.
- `STORE_DO` + `StoreDurableObject` SQLite.
- Store identity invariant và health endpoint cho DO.
- Store DO schema migration/versioning runner.
- Automated Store DO tests cho read/write, transaction commit/rollback, Store isolation, identity lock và schema migration guards.
- Shared contracts thật cho API health và `CommandEnvelope`.
- Typecheck riêng cho contracts, Worker production code và Worker tests.
- GitHub Actions CI chạy install frozen-lockfile, typecheck, tests và Desktop build trên push/PR.

M1 bắt đầu từ **Device identity + Store execution context**, sau đó mới triển khai Employee + PIN, permission context và nghiệp vụ bàn.

Xem tiến độ: [`docs/PROGRESS.md`](docs/PROGRESS.md).

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

## Kiến trúc hiện tại

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
├── .github/
│   └── workflows/
│       └── ci.yml
├── apps/
│   ├── desktop/       # Electron POS
│   ├── mobile/        # PWA scaffold
│   └── worker/        # Hono + Cloudflare Worker + D1 + Store DO
├── packages/
│   ├── contracts/     # Shared commands/events/API schemas
│   ├── domain/        # Pure business rules - triển khai dần từ M1
│   └── shared/        # Pure utilities
├── docs/
│   ├── ADR-001-single-store-no-branch.md
│   ├── ARCHITECTURE.md
│   ├── PRINTING_V1.md
│   ├── PROGRESS.md
│   └── SYSTEM_SCOPE_V1.md
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

## Quality gates

Chạy toàn bộ gate giống CI từ root:

```bash
pnpm run ci
```

Các gate riêng:

```bash
pnpm typecheck:contracts
pnpm typecheck:worker
pnpm typecheck:worker:test
pnpm test:worker
pnpm build:desktop
```

Nếu thay đổi `apps/worker/wrangler.jsonc`, tạo lại Cloudflare bindings trước khi typecheck:

```bash
pnpm --dir apps/worker run cf-typegen
```

## D1 local development

Migration `0001` hiện là Store-based control-plane schema.

Reset và apply D1 local từ đầu:

```bash
rm -rf apps/worker/.wrangler/state
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

Remote migration/deploy không phải gate của M0; chỉ thực hiện khi chuẩn bị môi trường remote/pilot và migration đã được review cho lần deploy đó.

## Store Durable Object tests

```bash
pnpm --dir apps/worker run typecheck
pnpm --dir apps/worker run typecheck:test
pnpm --dir apps/worker test
```

Store DO foundation hiện kiểm tra tự động:

- initialize/persist Store identity,
- SQLite read/write,
- transaction commit,
- transaction rollback,
- isolation giữa hai Store,
- identity lock,
- fresh schema version,
- migration idempotency,
- reject schema mới hơn code đang chạy.

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
- Mutation nghiệp vụ từ M1 đi qua command semantics.
- Offline persistence đến sau online vertical slice.
- Print template chỉ dùng allowlisted placeholder/block, không arbitrary script/code.

## Bước tiếp theo

Bắt đầu **M1 - Windows POS online vertical slice** theo thứ tự:

1. Device identity + Store execution context.
2. Employee + PIN authentication.
3. Permission context.
4. Table type + Billiard table.
5. Open playing session + server-time semantics.
6. Product catalog + add item.
7. Bill.
8. Cash / bank-transfer payment.
9. Close session/bill và trả bàn về `available`.

M1 dùng shared contracts/command semantics ngay từ đầu để giữ đường tiến hóa tới Mobile và offline/sync sau này.