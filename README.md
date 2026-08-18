# Billiard Management

Hệ thống quản lý cửa hàng billiards theo kiến trúc hybrid, ưu tiên **Windows Desktop POS** trước, sau đó mở rộng Mobile PWA và offline/sync khi online vertical slice đã ổn định.

## Trạng thái dự án

- **M0 - Foundation:** ✅ Done.
- **M1.1 - Device identity + Store execution context:** ✅ Done.
- **M1.2 - Employee PIN authentication + AuthGate:** ✅ Done.
- **Post-M1.2 review/hardening:** ✅ auth response `no-store`, regression coverage cho Device reactivation → AuthSession revocation, docs/roadmap đồng bộ lại với code.
- **M1.3 - Permission Context:** ⏭ Next.
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

Cloudflare Durable Object storage được chọn làm operational boundary vì mỗi object có storage riêng, transactional và strongly consistent; D1 giữ control-plane metadata và các batch mutation liên quan control-plane được thực thi tuần tự trong transaction. Xem [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) cho invariant chi tiết.

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
Employee PIN authentication
      │ PBKDF2-SHA256 + server-side lockout
      ▼
AuthSession bound Store + User + Membership + Device
      │
      ▼
requireAuthSession
      │ derive actor server-side
      ▼
Trusted AuthContext
      │
      ▼
Permission Context (M1.3)
```

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

Worker suite hiện cover Store DO, Device activation/context/isolation, system diagnostics, command trust boundary, PIN KDF, AuthSession credential, auth contracts/service/routes, lockout, session invalidation và Device reactivation session revocation.

**CI debt còn mở:** lint/format gate chưa được chuẩn hóa toàn monorepo; Desktop chưa có automated Electron integration/security tests; Mobile chưa tham gia root CI vì vẫn deferred scaffold.

## Nguyên tắc không phá vỡ

1. Store = tenant/data-isolation boundary; V1 không có branch.
2. D1 = control plane; Store DO = operational single-writer boundary.
3. Renderer không giữ Device/session secret.
4. Device/Store/Auth/Permission context resolve và enforce server-side.
5. Client `storeId/deviceId/actorId` không phải security authority.
6. Client `issuedAt` không phải authoritative online clock.
7. PIN không plaintext, không fast hash; lockout nằm server-side.
8. Auth responses không được cache.
9. Money không dùng floating-point.
10. Timer UI không phải nguồn sự thật.
11. Giá lịch sử không đổi theo config mới.
12. Mutation nghiệp vụ đi qua command semantics + idempotency policy.
13. Offline đến sau online vertical slice.
14. Mobile dùng chung contracts/commands/server rules.
15. Production/pilot schema chỉ đổi qua reviewed migration.

## Bước tiếp theo

M1 tiếp tục theo thứ tự:

1. ✅ Device identity + Store context.
2. ✅ Employee PIN + AuthGate.
3. ⏭ **Permission Context**.
4. TableType + BilliardTable.
5. Pricing foundation + Open TableSession.
6. Server-time timer semantics.
7. Product catalog + add item với price snapshot.
8. Bill lifecycle.
9. Cash / bank-transfer payment.
10. Finalize bill/session → bàn trở về `available`.

Không bắt đầu UI nghiệp vụ lớn trước khi M1.3 server-side authorization hoàn chỉnh. Xem [`docs/ROADMAP.md`](docs/ROADMAP.md) cho gate và thứ tự triển khai chi tiết.
