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

**M0 - Foundation đã hoàn thành. M1.1 - Device identity + Store execution context đã hoàn thành theo local/functional gate.**

Hiện hệ thống đã có:

- pnpm monorepo.
- Electron main/preload/renderer boundary với `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Typed IPC và narrow preload API.
- Desktop gọi Worker qua Main Process.
- Hono Worker local port `8787`.
- D1 control-plane migration `0001_init_control_plane.sql`.
- Device credential/activation migration `0002_add_device_credentials.sql`.
- Store = tenant/data-isolation boundary; không có branch model trong schema hiện hành.
- `STORE_DO` + SQLite-backed `StoreDurableObject` cho mỗi Store.
- Store identity invariant + Store DO schema migration/versioning runner.
- Device activation bằng one-time token; raw activation token không lưu trong D1.
- Device secret 256-bit; D1 chỉ lưu credential hash.
- Device credential rotation khi re-activate cùng Store + installation.
- Worker resolve trusted Store context từ Device; client không tự quyết `storeId`.
- Electron tạo installation identity ổn định và lưu device credential bằng async `safeStorage` trong Main Process.
- Renderer không nhận `deviceSecret`.
- DeviceGate/ActivationScreen cho các trạng thái activation, reactivation, blocked, unavailable và ready.
- Shared Zod contracts cho health, `CommandEnvelope`, device activation và device context.
- 18 Worker tests: 9 Store DO + 9 Device context.
- GitHub Actions CI chạy frozen install, typecheck, Worker tests và Desktop build trên push/PR.

Bước nghiệp vụ tiếp theo là **M1.2 - Employee + PIN/AuthGate**, sau đó mới tới permission context và nghiệp vụ bàn.

Xem tiến độ và hardening còn mở: [`docs/PROGRESS.md`](docs/PROGRESS.md).

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

Device trust chain hiện tại:

```text
Electron Renderer
      │ typed IPC; không có secret
      ▼
Electron Main
      │ installationId + encrypted device credential
      ▼
Worker
      │ authenticate Device bằng D1
      ▼
Trusted Store context
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

Desktop dev dùng `MAIN_VITE_API_BASE_URL=http://localhost:8787` từ `apps/desktop/.env.example`. Packaged build phải dùng backend HTTPS; HTTP chỉ dành cho loopback trong development.

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

Control plane hiện có migration `0001` và `0002`.

Reset và apply D1 local từ đầu:

```bash
rm -rf apps/worker/.wrangler/state
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

Remote migration/deploy chưa phải gate hiện tại. Trước remote/pilot phải review system diagnostics, secret transport, activation issuance và migrations của môi trường đích.

## Worker tests

```bash
pnpm --dir apps/worker run typecheck
pnpm --dir apps/worker run typecheck:test
pnpm --dir apps/worker test
```

Coverage hành vi hiện tại gồm:

- Store DO identity/schema/read-write/transaction/isolation,
- activation token one-time + expiry,
- device secret chỉ lưu hash,
- wrong/revoked credential,
- inactive Store,
- credential rotation,
- spoofed client Store ID không thay đổi trusted Store context.

## Nguyên tắc kiến trúc

- Store = tenant/data isolation boundary.
- V1 không có branch.
- D1 là control plane.
- Store DO là operational single-writer boundary.
- Renderer không truy cập Node/Electron trực tiếp và không giữ device secret.
- Network/secure storage/printing/updater nằm ở Main Process.
- Store/Auth/Permission context phải resolve và enforce server-side.
- Không lưu raw session token.
- PIN/rate-limit/lockout thiết kế cùng AuthGate.
- Loại bàn và pricing là dữ liệu cấu hình, không hard-code.
- Timer UI không phải nguồn sự thật của thời gian chơi.
- Money không dùng floating-point.
- Giá lịch sử không đổi theo cấu hình mới.
- Mutation nghiệp vụ đi qua command semantics.
- Offline persistence đến sau online vertical slice.
- Print template chỉ dùng allowlisted placeholder/block, không arbitrary script/code.

## Bước tiếp theo

Thứ tự M1 hiện tại:

1. ✅ Device identity + Store execution context.
2. ⏭ Employee + PIN/AuthGate.
3. Permission context.
4. Table type + Billiard table.
5. Open playing session + server-time semantics.
6. Product catalog + add item.
7. Bill.
8. Cash / bank-transfer payment.
9. Close session/bill và trả bàn về `available`.

Trước remote deployment phải hoàn tất các hardening được ghi trong [`docs/PROGRESS.md`](docs/PROGRESS.md).