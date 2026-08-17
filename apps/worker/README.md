# Billiards API Worker

Cloudflare Worker dùng Hono làm gateway/API cho hệ thống billiards.

## Trách nhiệm hiện tại

- HTTP API entrypoint.
- Health endpoint.
- D1 control-plane access qua binding `DB`.
- Type-safe Cloudflare bindings qua `wrangler types`.

Operational billiards state không được đặt trực tiếp vào D1. Phần đó sẽ thuộc Branch Durable Object ở bước tiếp theo.

## Chạy local

Từ root repository:

```bash
pnpm dev:worker
```

Worker local dùng port cố định:

```text
http://localhost:8787
```

Health checks:

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/api/system/db-health
```

## Type generation / typecheck

Sau khi thay đổi bindings trong `wrangler.jsonc`:

```bash
pnpm --dir apps/worker run cf-typegen
```

Typecheck:

```bash
pnpm --dir apps/worker run typecheck
```

`CloudflareBindings` được dùng làm Hono binding generic:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## D1

Database:

```text
billiards-control-plane
```

Binding:

```text
DB
```

Migration directory:

```text
apps/worker/migrations/
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

Không chạy migration `--remote` chỉ để thử nghiệm. Review schema trước khi apply remote.

## Endpoint hiện tại

### `GET /api/health`

Kiểm tra Worker/Hono.

### `GET /api/system/db-health`

Kiểm tra Worker có query được D1 binding và đọc migration state.

## Bước tiếp theo

Tạo SQLite-backed Branch Durable Object:

```text
Worker
  ↓ branchId
BRANCH_DO.idFromName(branchId)
  ↓
BranchDurableObject
  ↓
SQLite
```

Spike phải pass read/write metadata và transaction smoke test trước khi thêm table/bill/product/payment nghiệp vụ thật.
