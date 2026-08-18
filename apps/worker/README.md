# Billiards API Worker

Cloudflare Worker dùng Hono làm gateway/API cho hệ thống quản lý billiards.

## Trách nhiệm hiện tại

- HTTP API entrypoint.
- D1 control-plane access qua binding `DB`.
- `STORE_DO` → SQLite-backed `StoreDurableObject`, một Durable Object cho mỗi Store.
- Device activation/authentication.
- Resolve trusted Store execution context từ Device server-side.
- System diagnostics phục vụ foundation/local development.
- Type-safe Cloudflare bindings qua `wrangler types`.

Operational billiards state không đặt trực tiếp vào D1. D1 giữ control/auth/device metadata; operational state thuộc Store Durable Object.

## Trust boundary hiện tại

```text
Desktop Main
      │
      │ Authorization:
      │ Device <deviceId>.<deviceSecret>
      ▼
Worker
      │
      ├── parse/validate Device credential
      ├── lookup D1 devices + stores
      ├── verify credential hash
      ├── reject revoked/inactive state
      └── resolve trusted Store context
```

Client-supplied `storeId` hoặc `x-store-id` không phải authority cho POS business requests.

## Chạy local

Từ root repository:

```bash
pnpm dev:worker
```

Worker local:

```text
http://localhost:8787
```

Basic health:

```bash
curl http://localhost:8787/api/health
```

Foundation diagnostics local:

```bash
curl http://localhost:8787/api/system/db-health
```

`/api/system/*` hiện là diagnostic surface và phải được protect/disable trước remote/pilot deployment.

## Type generation / typecheck / tests

Sau khi thay đổi bindings trong `wrangler.jsonc`:

```bash
pnpm --dir apps/worker run cf-typegen
```

Chạy riêng:

```bash
pnpm --dir apps/worker run typecheck
pnpm --dir apps/worker run typecheck:test
pnpm --dir apps/worker test
```

Hiện có 22 Worker tests:

- 9 Store Durable Object tests.
- 9 Device context/activation tests.
- 4 Device authorization parser tests.

Từ root, gate đầy đủ:

```bash
pnpm run ci
```

## D1 Control Plane

Database:

```text
billiards-control-plane
```

Binding:

```text
DB
```

Migration hiện tại:

```text
0001_init_control_plane.sql
0002_add_device_credentials.sql
```

Apply local migrations:

```bash
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
```

Inspect local migrations:

```bash
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "SELECT * FROM d1_migrations ORDER BY id;"
```

Validate foreign keys:

```bash
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

Không chạy migration `--remote` để thử nghiệm. Review schema và deployment boundary trước khi apply remote.

## Endpoint hiện tại

### Public/basic

- `GET /`
- `GET /api/health`

### Device

- `POST /api/devices/activate`
  - nhận one-time activation token,
  - tạo/reactivate device,
  - raw secret chỉ trả về một lần,
  - D1 chỉ lưu hash.

### POS Device context

- `GET /api/pos/context`
  - yêu cầu Device credential,
  - trả trusted Device + Store context.

### Foundation diagnostics

- `GET /api/system/db-health`
- `GET /api/system/stores/:storeId/do-health`

Các endpoint `/api/system/*` không phải business API và chưa được xem là public production surface.

## Store Durable Object

```text
trusted storeId
      ↓
STORE_DO.idFromName(storeId)
      ↓
StoreDurableObject
      ↓
SQLite operational DB
```

Foundation Store DO đã có:

- persisted Store identity,
- identity mismatch guard,
- schema versioning/migration runner,
- transaction/read-write tests,
- Store isolation tests.

Business tables như table/session/product/bill/payment sẽ được thêm theo vertical slice, không tạo trước toàn bộ schema.

## Bước tiếp theo

Sau post-M1.1 hardening, triển khai:

```text
Device + trusted Store ✅
      ↓
Employee + PIN/AuthGate
      ↓
Permission context
      ↓
TableType + BilliardTable
      ↓
POS business commands
```

Không route mutation nghiệp vụ dựa trên `storeId` do client tự khai.