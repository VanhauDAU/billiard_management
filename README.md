# Billiard Management

Hệ thống quản lý cửa hàng billiards theo kiến trúc hybrid hiện đại, ưu tiên **Windows Desktop POS** trước, sau đó mở rộng Mobile PWA và offline/sync khi online vertical slice đã ổn định.

## Trạng thái dự án

- **M0 - Foundation:** ✅ Done (Monorepo, Worker Hono, D1, Store DO SQLite, Contracts, CI).
- **M1.1 - Device identity + Store execution context:** ✅ Done (One-time token, 256-bit hashed secret, safeStorage, DeviceGate).
- **M1.2 - Employee PIN authentication + AuthGate:** ✅ Done (PBKDF2-SHA256, lockout, AuthSession, safeStorage).
- **M1.3 - Permission Context & RBAC:** ✅ Done (`role_permissions`, `PermissionContext`, `requirePermission`, fail-closed).
- **M1.4 - Table & TableType Foundation:** ✅ Done (Store DO migration 002, Table command executor, RPC, API & Desktop UI).
- **Auth & Store Management Enhancement:** ✅ Done (Owner/Manager username/password login + Staff quick PIN login, staff management, expanded permission catalog).
- **M1.5 - Pricing Foundation + Open TableSession:** ⏭ Next.
- Remote/pilot: chưa triển khai; còn business slice (pricing, session, bill, payment), release/update, remote migrations/secrets/observability và packaged Windows smoke.

---

## 📂 Hệ thống tài liệu dự án

Toàn bộ tài liệu kỹ thuật và nghiệp vụ được cấu trúc trong thư mục [`docs/`](docs/README.md):

- **Phân tích & Nghiệp vụ:** [`docs/01-phantich/SYSTEM_SCOPE_V1.md`](docs/01-phantich/SYSTEM_SCOPE_V1.md) | [`PRINTING_V1.md`](docs/01-phantich/PRINTING_V1.md) | [`ADR-001`](docs/01-phantich/ADR-001-single-store-no-branch.md) | [`ADR-002`](docs/01-phantich/ADR-002-command-trust-boundary.md) | [`ADR-003`](docs/01-phantich/ADR-003-device-installation-single-store.md)
- **Kiến trúc & Lộ trình:** [`docs/02-tongquan/ARCHITECTURE.md`](docs/02-tongquan/ARCHITECTURE.md) | [`ROADMAP.md`](docs/02-tongquan/ROADMAP.md) | [`PROGRESS.md`](docs/02-tongquan/PROGRESS.md)
- **Cơ sở dữ liệu:** [`docs/03-database/D1_CONTROL_PLANE.md`](docs/03-database/D1_CONTROL_PLANE.md) | [`STORE_DURABLE_OBJECT_SQLITE.md`](docs/03-database/STORE_DURABLE_OBJECT_SQLITE.md)
- **API & Giao thức:** [`docs/04-api/API_REFERENCE.md`](docs/04-api/API_REFERENCE.md) | [`COMMANDS_AND_RPC.md`](docs/04-api/COMMANDS_AND_RPC.md) | [`PERMISSIONS_CATALOG.md`](docs/04-api/PERMISSIONS_CATALOG.md)
- **Hướng dẫn & Vận hành:** [`docs/05-huongdan/DEVELOPMENT_GUIDE.md`](docs/05-huongdan/DEVELOPMENT_GUIDE.md) | [`DESKTOP_DEPLOYMENT.md`](docs/05-huongdan/DESKTOP_DEPLOYMENT.md) | [`SECURITY_GUIDELINES.md`](docs/05-huongdan/SECURITY_GUIDELINES.md)

---

## Scope đã chốt

- **Một Store = một cửa hàng vật lý** và là tenant/data-isolation boundary.
- V1 **không có branch/chi nhánh**.
- Desktop POS: Electron + React + TypeScript; Windows là target triển khai đầu tiên.
- Mobile PWA: triển khai sau, dùng cùng Worker APIs/contracts/business rules và permission model.
- API/Gateway: Cloudflare Workers + Hono.
- Control plane: Cloudflare D1.
- Operational data plane: một SQLite-backed **Store Durable Object** cho mỗi Store.
- Offline local SQLite + persistent outbox + sync triển khai sau online vertical slice.

## Kiến trúc hiện tại

```text
Windows Desktop POS                  Mobile PWA (deferred)
Electron + React                     React + Vite
        │
        │ Main Process owns credentials/network/native capabilities
        ▼
Cloudflare Worker / Hono
        │
        ├──────────────► D1 Control Plane
        │                Store / User / Role / Permission Catalog
        │                Device / Password / PIN / AuthSession / Registry
        │
        └──────────────► Store Durable Object
                         one SQLite DB / Store
                         operational single-writer boundary
                         tables / table_types / table_commands /
                         pricing / sessions / products /
                         bills / payments / events
```

Cloudflare Durable Object storage được chọn làm operational boundary vì mỗi object có storage riêng, transactional và strongly consistent; D1 giữ control-plane metadata và các batch mutation liên quan control-plane được thực thi tuần tự trong transaction. Xem [`docs/02-tongquan/ARCHITECTURE.md`](docs/02-tongquan/ARCHITECTURE.md) cho invariant chi tiết.

## Trust chain đã triển khai

```text
Electron Renderer
      │ narrow typed IPC; không giữ raw credential
      ▼
Electron Main
      │ encrypted Device credential + encrypted AuthSession credential
      ▼
Worker requireDevice
      │ resolve Store từ D1, không tin client storeId
      ▼
Trusted DeviceContext
      │
      ▼
Authentication Gateway (Dual Auth Model)
      ├── Owner / Manager: Username/Email + Password (PBKDF2-SHA256)
      └── Cashier / Staff: Employee Picker + PIN 4-6 số (PBKDF2-SHA256) + server lockout
      ▼
AuthSession bound Store + User + Membership + Device
      │
      ▼
Worker requireAuthSession
      │ derive actor server-side, validate session token hash & status
      ▼
Trusted AuthContext
      │
      ▼
Worker requirePermission (M1.3)
      │ resolve permissions từ role_permissions theo Store + Role
      ▼
Trusted PermissionContext
      │
      ▼
Store DO Table & POS Operations (M1.4+)
      │ command envelope + idempotency fingerprint + Store DO SQLite
```

## Cấu trúc repository

```text
billiard_management/
├── .github/
│   └── workflows/ci.yml
├── apps/
│   ├── desktop/       # Electron POS + Management App
│   ├── mobile/        # PWA scaffold (deferred)
│   └── worker/        # Hono Gateway + D1 Control Plane + Store DO
├── packages/
│   ├── contracts/     # Shared Zod contracts (Auth, Device, Tables, Commands)
│   ├── domain/        # Pure business rules - triển khai theo vertical slice
│   ├── shared/        # Pure utilities
│   └── ui/            # Shared UI components
├── docs/
│   ├── 01-phantich/   # Scope V1, In ấn, ADRs
│   ├── 02-tongquan/   # Kiến trúc, Roadmap, Tiến độ
│   ├── 03-database/   # D1 Control Plane, Store DO SQLite
│   ├── 04-api/        # API Reference, Commands & RPC, Permissions
│   ├── 05-huongdan/   # Hướng dẫn Dev, Đóng gói Desktop, Bảo mật
│   └── README.md      # Mục lục tổng quan docs
├── package.json
└── pnpm-workspace.yaml
```

## Chạy local

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

Health check:

```bash
curl http://localhost:8787/api/health
```

Terminal 2 - Desktop:

```bash
pnpm dev:desktop
```

Desktop dev dùng `MAIN_VITE_API_BASE_URL=http://localhost:8787`. Packaged build bắt buộc dùng backend HTTPS.

## Quality gates

Gate chuẩn từ root:

```bash
pnpm run ci
```

Hiện gate gồm:

```bash
pnpm typecheck:contracts
pnpm typecheck:worker
pnpm typecheck:worker:test
pnpm test:worker
pnpm build:desktop
```

Worker test suite hiện có **19 test files (171 tests)** bảo đảm độ tin cậy tuyệt đối cho toàn bộ hệ thống.
