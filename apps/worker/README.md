# Billiards API Worker

Cloudflare Worker sử dụng Hono framework làm gateway/API cho hệ thống quản lý quán billiards.

## 1. Trách nhiệm & Ranh giới Hệ thống

- HTTP API Entrypoint và routing.
- Quản lý D1 Control Plane qua binding `DB`.
- Định tuyến và giao tiếp với SQLite-backed `StoreDurableObject` qua binding `STORE_DO`.
- Middleware bảo mật: `requireDevice`, `requireAuthSession`, `requirePermission`, `requireSystemDiagnostics`.
- Xác thực kép: Đăng nhập Quản trị (Username/Email + Password) và Đăng nhập nhanh Nhân viên (Mã PIN).
- Quản lý phân quyền RBAC và kiểm tra quyền trước mọi mutation nghiệp vụ.
- Store DO Table Command Executor với cơ chế chống lặp lệnh (Idempotency).

Dữ liệu vận hành của quán (bàn, phiên chơi, hóa đơn, thanh toán) **không** lưu trực tiếp trong D1 mà nằm hoàn toàn trong Store Durable Object tương ứng.

---

## 2. Ranh giới Xác thực & Phân quyền

```text
Desktop Main / Client Request
       │
       │ Authorization: Device <deviceId>.<deviceSecret>
       │ Authorization: Bearer <sessionToken>
       ▼
Worker Middlewares:
       ├── 1. requireDevice: Xác thực thiết bị -> Trích xuất Store context từ D1
       ├── 2. requireAuthSession: Xác thực session -> Trích xuất User, Membership, Role
       ├── 3. requirePermission: Kiểm tra quyền hạn của Role trong Store
       └── 4. Enrich dữ liệu thành TrustedCommandEnvelope trước khi gọi Store DO
```

---

## 3. Khởi chạy Local & Phát triển

Từ root repository:

```bash
pnpm dev:worker
```

Worker local sẽ lắng nghe tại: `http://localhost:8787`

Kiểm tra sức khỏe Worker:

```bash
curl http://localhost:8787/api/health
```

### System Diagnostics Local

Diagnostics fail-closed nếu `SYSTEM_DIAGNOSTICS_TOKEN` không tồn tại hoặc quá ngắn.

Tạo local secret:

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

---

## 4. D1 Control Plane Migrations

Migrations hiện có:

```text
0001_init_control_plane.sql
0002_add_device_credentials.sql
0003_enforce_global_device_installation.sql
0004_add_employee_pin_credentials.sql
0005_add_user_password_and_store_permissions.sql
```

Áp dụng migrations local:

```bash
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
```

Kiểm tra ràng buộc Foreign Keys:

```bash
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

---

## 5. Type generation & Tests

Sau khi cập nhật bindings trong `wrangler.jsonc`:

```bash
pnpm --dir apps/worker run cf-typegen
```

Chạy kiểm thử:

```bash
pnpm --dir apps/worker run typecheck
pnpm --dir apps/worker run typecheck:test
pnpm --dir apps/worker test
```

Hiện có **19 test files (171 tests)** bao quát toàn bộ logic Store DO, xác thực thiết bị, mã hóa mật khẩu / PIN, session revocation, RBAC permissions và Table commands.

---

## 6. Tài liệu liên quan

- [`../../docs/02-tongquan/ARCHITECTURE.md`](../../docs/02-tongquan/ARCHITECTURE.md)
- [`../../docs/03-database/D1_CONTROL_PLANE.md`](../../docs/03-database/D1_CONTROL_PLANE.md)
- [`../../docs/03-database/STORE_DURABLE_OBJECT_SQLITE.md`](../../docs/03-database/STORE_DURABLE_OBJECT_SQLITE.md)
- [`../../docs/04-api/API_REFERENCE.md`](../../docs/04-api/API_REFERENCE.md)
- [`../../docs/04-api/PERMISSIONS_CATALOG.md`](../../docs/04-api/PERMISSIONS_CATALOG.md)