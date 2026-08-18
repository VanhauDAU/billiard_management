# Billiards API Worker

Cloudflare Worker dùng Hono làm gateway/API cho hệ thống quản lý billiards.

## Trách nhiệm hiện tại

- HTTP API entrypoint.
- D1 control-plane access qua binding `DB`.
- `STORE_DO` → SQLite-backed `StoreDurableObject`, một Durable Object cho mỗi Store.
- Device activation/authentication.
- Resolve trusted Store execution context từ Device server-side.
- Protected system diagnostics cho foundation/ops.
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
      ├── validate scheme / UUID / secret format
      ├── lookup D1 devices + stores
      ├── verify credential hash
      ├── reject revoked/inactive state
      └── resolve trusted Store context
```

Client-supplied `storeId` hoặc `x-store-id` không phải authority cho POS business requests. Client command envelope cũng không được tự khai `storeId/deviceId/actorId` làm identity authority.

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

### System diagnostics local

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

`apps/worker/.dev.vars` bị ignore khỏi Git. Secret remote phải được cấu hình qua deployment secret/config, không commit vào repository.

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

Hiện có **29 Worker tests**:

- 9 Store Durable Object tests.
- 9 Device context/activation tests.
- 4 Device authorization parser tests.
- 3 System diagnostics auth tests.
- 1 Cross-Store installation test.
- 3 Command trust-boundary tests.

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

Migrations hiện tại:

```text
0001_init_control_plane.sql
0002_add_device_credentials.sql
0003_enforce_global_device_installation.sql
```

`0003` bảo đảm một `installationId` chỉ thuộc tối đa một Store tại một thời điểm. Re-activation cùng Store được phép rotate credential; activation sang Store khác trả conflict và không tự chuyển tenant.

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

Không chạy migration `--remote` để thử nghiệm. Review schema, secrets và deployment boundary trước khi apply remote.

## Endpoint hiện tại

### Public/basic

- `GET /`
- `GET /api/health`

### Device

- `POST /api/devices/activate`
  - nhận one-time activation token,
  - tạo/reactivate device,
  - raw secret chỉ trả về một lần,
  - D1 chỉ lưu hash,
  - invalid token → 401,
  - expected constraint conflict → 409,
  - unexpected backend/invariant failure → 503.

### POS Device context

- `GET /api/pos/context`
  - yêu cầu Device credential,
  - trả trusted Device + Store context.

### Protected system diagnostics

- `GET /api/system/db-health`
- `GET /api/system/stores/:storeId/do-health`

Các endpoint `/api/system/*` yêu cầu Bearer token riêng. Nếu diagnostics token chưa được cấu hình hợp lệ, route trả 404 fail-closed.

## Command trust boundary

Client command intent chỉ gồm:

```text
commandId
issuedAt
commandType
payload
```

Store/Device/Actor identity được Worker enrich sau khi authentication thành công. `issuedAt` là client intent timestamp, không phải authoritative clock cho session/pricing/payment/audit execution time.

Chi tiết: `../../docs/ADR-002-command-trust-boundary.md`.

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

Migration runner hiện kiểm tra migration sequence, reject future schema version và chạy từng migration trong `transactionSync`. Business tables như table/session/product/bill/payment sẽ được thêm theo vertical slice, không tạo trước toàn bộ schema.

## Bước tiếp theo

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

Employee/Auth request sau này vẫn phải đi qua Device context hợp lệ; session token không được bypass revoked Device hoặc inactive Store.