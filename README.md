# Billiard Management

Hệ thống quản lý cửa hàng billiards theo kiến trúc hybrid, ưu tiên **Windows Desktop POS** trước, sau đó mở rộng Mobile PWA và offline/sync khi online vertical slice đã ổn định.

## Trạng thái dự án

- **M0 - Foundation:** ✅ Done.
- **M1.1 - Device identity + Store execution context:** ✅ Done.
- **M1.2 - Employee PIN authentication + AuthGate:** ✅ Done.
- **Post-M1.2 review/hardening:** ✅ Done.
- **M1.3 - Permission Context:** ✅ Done.
- **M1.4 - TableType + BilliardTable:** ⏭ Next.
- Remote/pilot: chưa triển khai; còn business slice, release/update, remote migrations/secrets/observability và packaged Windows smoke.

Tiến độ chi tiết: [`docs/PROGRESS.md`](docs/PROGRESS.md)  
Kế hoạch milestone: [`docs/ROADMAP.md`](docs/ROADMAP.md)  
Kiến trúc: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
Scope V1: [`docs/SYSTEM_SCOPE_V1.md`](docs/SYSTEM_SCOPE_V1.md)

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
        │                Store / User / Role / Permission
        │                Device / PIN / AuthSession / Registry
        │
        └──────────────► Store Durable Object
                         one SQLite DB / Store
                         operational single-writer boundary
                         tables / pricing / sessions / products /
                         bills / payments / commands / events
```

D1 giữ control-plane metadata. Operational billiards state nằm trong Store Durable Object SQLite theo Store; M1.4 là milestone đầu tiên bắt đầu thêm schema nghiệp vụ thật vào Store DO.

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
      ↓
Employee PIN authentication
      │ PBKDF2-SHA256 + server-side lockout
      ▼
AuthSession bound Store + User + Membership + Device
      ↓
requireAuthSession
      │ derive actor server-side
      ▼
Trusted AuthContext
      ↓
resolvePermissionContext
      │ current Membership + Role + role_permissions
      ▼
Trusted PermissionContext
      ↓
requirePermission(permissionKey)
      ↓
Business handler
```

Renderer có thể nhận capability snapshot qua `/api/auth/permissions` để hide/disable UI, nhưng **Renderer `hasPermission(...)` chỉ là UX**. Worker `requirePermission(...)` mới là security authority.

### M1.1 - Device + Store

Đã có:

- one-time activation token; raw activation token không persist,
- Device secret 256-bit; D1 chỉ lưu hash,
- reactivation cùng Store + installation rotate Device credential,
- một `installationId` chỉ thuộc tối đa một Store; cross-Store activation fail-closed,
- Device middleware kiểm tra Device + Store status,
- trusted Store context resolve server-side,
- Electron Main lưu Device credential bằng async `safeStorage`,
- DeviceGate cho activation/reactivation/blocked/unavailable/local-error/ready,
- packaged Desktop bắt buộc backend HTTPS; HTTP chỉ cho loopback trong development,
- privileged IPC chỉ chấp nhận trusted top-level renderer frame,
- Chromium permission deny-by-default và renderer sandbox/context isolation.

### M1.2 - Employee PIN + AuthGate

Đã có:

- danh sách employee chỉ trong trusted Store của Device,
- PIN là chuỗi **4-6 chữ số**, giữ leading zero như `0012`,
- PIN dùng PBKDF2-SHA256 với salt; không plaintext và không raw SHA-256,
- server-side failure window + escalating lockout theo Store + User + Device,
- random AuthSession secret; D1 chỉ lưu SHA-256 hash của secret,
- session bind `Store + User + Membership + Device + PIN credential version`,
- User/Membership/Role/Device/Store/PIN status được re-check khi authenticate session,
- Device reactivation revoke AuthSession cũ,
- PIN credential version đổi làm session cũ mất hiệu lực,
- `/api/auth/employees`, `/api/auth/pin`, `/api/auth/session`, `/api/auth/logout`,
- auth response được đánh `Cache-Control: no-store`,
- Electron Main sở hữu raw `sessionToken`, lưu bằng async `safeStorage`,
- Renderer chỉ nhận safe session metadata và không nhận `deviceSecret`/`sessionToken`,
- AuthGate: chọn nhân viên → nhập PIN → lockout countdown → authenticated state → logout,
- restart Desktop có thể restore phiên còn hợp lệ qua server validation.

### M1.3 - Permission Context

Đã có:

- shared system permission allowlist/schema trong `@billiards/contracts`,
- D1 `permission_catalog` + `role_permissions` làm control-plane permission source,
- trusted internal `PermissionContext`,
- permission resolver re-check current Membership/Role và fail-closed với permission key lạ,
- `requirePermission(permissionKey)` server-side,
- `401` cho authentication/current actor invalid; `403 permission_denied` cho actor thiếu capability,
- permission removal và role reassignment có hiệu lực ở request kế tiếp,
- cross-Store/client-spoof regression coverage,
- `GET /api/auth/permissions` cho safe client capability snapshot,
- Electron Main giữ raw credentials, IPC/Preload chỉ expose permission list,
- Renderer `PermissionGate` fail-closed khi không xác minh được permission,
- Worker integration tests đi qua full Device → AuthSession → Permission chain.

M1.3 không thêm D1 migration mới.

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

## Cấu trúc repository

```text
billiard_management/
├── .github/
│   ├── pull_request_template.md
│   └── workflows/ci.yml
├── apps/
│   ├── desktop/       # Electron POS
│   ├── mobile/        # PWA scaffold, deferred
│   └── worker/        # Hono + Worker + D1 + Store DO
├── packages/
│   ├── contracts/     # Shared Zod/API/command contracts
│   ├── domain/        # Pure business rules - triển khai theo vertical slice
│   └── shared/        # Pure utilities
├── docs/
│   ├── ADR-001-single-store-no-branch.md
│   ├── ADR-002-command-trust-boundary.md
│   ├── ADR-003-device-installation-single-store.md
│   ├── ARCHITECTURE.md
│   ├── PRINTING_V1.md
│   ├── PROGRESS.md
│   ├── ROADMAP.md
│   └── SYSTEM_SCOPE_V1.md
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

Health:

```bash
curl http://localhost:8787/api/health
```

System diagnostics là surface riêng. Nếu cần dùng local:

```bash
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
TOKEN=$(openssl rand -hex 32)
printf 'SYSTEM_DIAGNOSTICS_TOKEN=%s\n' "$TOKEN" > apps/worker/.dev.vars
```

Restart Worker rồi gọi:

```bash
curl http://localhost:8787/api/system/db-health \
  -H "Authorization: Bearer $TOKEN"
```

Nếu token chưa cấu hình đủ mạnh, `/api/system/*` trả 404 fail-closed.

Terminal 2 - Desktop:

```bash
pnpm dev:desktop
```

Desktop dev dùng `MAIN_VITE_API_BASE_URL=http://localhost:8787`. Packaged build phải dùng backend HTTPS.

## D1 migrations

Control-plane migrations hiện có:

```text
0001_init_control_plane.sql
0002_add_device_credentials.sql
0003_enforce_global_device_installation.sql
0004_add_employee_pin_credentials.sql
```

Reset/apply local:

```bash
rm -rf apps/worker/.wrangler/state
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

Không apply migration remote như một thao tác mặc định. Remote/pilot phải review migrations, secrets, backup/recovery và observability trước.

## Store DO schema

Store DO hiện đang ở schema version **1 - foundation**; chưa có operational billiards tables.

M1.4 sẽ tạo schema version 2 cho:

```text
table_types
billiard_tables
```

Các bảng này nằm trong Store DO SQLite, **không nằm trong D1**.

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

Nếu thay `apps/worker/wrangler.jsonc`:

```bash
pnpm --dir apps/worker run cf-typegen
```

Worker suite hiện cover Store DO foundation/isolation, Device activation/context/isolation, system diagnostics, command trust boundary, PIN KDF, AuthSession credential/auth routes, session invalidation/reactivation, auth cache policy và Permission Context authorization.

**CI debt còn mở:** lint/format gate chưa được chuẩn hóa toàn monorepo; Desktop chưa có automated Electron integration/security tests; Mobile chưa tham gia root CI vì vẫn deferred scaffold.

## Nguyên tắc không phá vỡ

1. Store = tenant/data-isolation boundary; V1 không có branch.
2. D1 = control plane; Store DO = operational single-writer boundary.
3. Renderer không giữ Device/session secret.
4. Device/Store/Auth/Permission context resolve và enforce server-side.
5. Client `storeId/deviceId/actorId/role/permission` không phải security authority.
6. Renderer capability snapshot chỉ là UX; Worker `requirePermission` là authority.
7. Client `issuedAt` không phải authoritative online clock.
8. PIN không plaintext, không fast hash; lockout nằm server-side.
9. Auth responses không được cache.
10. Money không dùng floating-point.
11. Timer UI không phải nguồn sự thật.
12. Giá lịch sử không đổi theo config mới.
13. Mutation nghiệp vụ đi qua command/transaction/idempotency semantics phù hợp với risk của operation.
14. Offline đến sau online vertical slice.
15. Mobile dùng chung contracts/commands/server rules.
16. Production/pilot schema chỉ đổi qua reviewed migration.

## Bước tiếp theo

**M1.4 - TableType + BilliardTable**:

1. khóa table domain/schema decisions,
2. Store DO migration version 2,
3. shared contracts,
4. Store DO table repository/service,
5. Worker `table.view` / `table.manage` routes,
6. migration/Store-isolation/permission tests,
7. Desktop list/management smoke tối thiểu,
8. CI + docs.

Trong M1.4 chỉ quản lý lifecycle cấu hình `active/disabled`. Không lưu `occupied` như master flag; từ M1.5 trạng thái đang sử dụng phải derive từ active `TableSession`.

Không bắt đầu pricing/open-table/timer/product/bill/offline trước khi M1.4 đóng. Xem [`docs/ROADMAP.md`](docs/ROADMAP.md) cho gate chi tiết.