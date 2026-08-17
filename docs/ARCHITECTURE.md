# Kiến trúc hệ thống

Cập nhật: **2026-08-18**

## Mục tiêu

Hệ thống quản lý billiards phải đáp ứng đồng thời:

- POS desktop chạy ổn định tại cửa hàng.
- Quản lý trên smartphone ở giai đoạn sau.
- Có backend cloud để quản lý tenant/branch/user/device và đồng bộ.
- Có đường tiến hóa tới offline-first mà không phải viết lại command semantics.
- Có thể cập nhật desktop từ xa sau này.

Kiến trúc hiện tại tách **control plane** và **operational data plane**.

## Sơ đồ tổng thể

```text
┌─────────────────────────┐          ┌─────────────────────────┐
│ Windows Desktop POS     │          │ Mobile PWA              │
│ Electron + React + TS   │          │ React + Vite            │
└────────────┬────────────┘          └────────────┬────────────┘
             │                                     │
             └──────────────────┬──────────────────┘
                                ▼
                     ┌──────────────────────┐
                     │ Cloudflare Worker    │
                     │ Hono gateway/API     │
                     └──────────┬───────────┘
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
       ┌────────────────────┐       ┌────────────────────────┐
       │ D1 Control Plane   │       │ Branch Durable Object  │
       │ tenant/user/branch │       │ one object / branch    │
       │ membership/device  │       │ SQLite operational DB  │
       │ auth/session       │       └───────────┬────────────┘
       └────────────────────┘                   │
                                               ▼
                                   tables / sessions / bills
                                   products / payments
                                   commands / events
```

## Desktop process boundary

Electron được chia thành ba vùng:

```text
Renderer (React)
      │
      │ window.desktopApi
      ▼
Preload
      │
      │ typed IPC
      ▼
Main Process
      │
      ├── HTTP/backend client
      ├── future local SQLite
      ├── future printing
      ├── future sync/outbox
      ├── future updater
      └── secure storage
```

Nguyên tắc:

- Renderer không có Node integration.
- Renderer không được expose `ipcRenderer` trực tiếp.
- Preload chỉ expose API hẹp, typed.
- Main process là nơi phù hợp cho network orchestration, local storage, printing và updater.
- Navigation/open-external phải được kiểm soát ở main process.

## Control plane - D1

D1 hiện sở hữu các loại dữ liệu mang tính SaaS/control:

- `tenants`
- `branches`
- `users`
- `memberships`
- `devices`
- `auth_sessions`
- `branch_registry`

D1 **không** phải operational database cho hoạt động realtime của bàn billiards.

Không đặt các bảng sau vào D1 nếu không có quyết định kiến trúc mới:

- billiards tables,
- table sessions,
- bills,
- bill items,
- products vận hành theo branch,
- payments,
- pricing timeline,
- command processing state của branch.

## Branch Durable Object - data plane

Mục tiêu tiếp theo là một Durable Object cho mỗi branch.

Định danh dự kiến:

```text
branchId
  ↓
BRANCH_DO.idFromName(branchId)
  ↓
BranchDurableObject
```

Mỗi Branch DO sở hữu SQLite operational state của đúng một branch.

Lợi ích kiến trúc mong muốn:

- single-writer boundary rõ cho operational state,
- transaction cục bộ theo branch,
- realtime connection có nơi hội tụ,
- command idempotency dễ enforce,
- giảm conflict write giữa nhiều client.

Trước khi thêm nghiệp vụ thật, DO phải pass spike:

- initialize SQLite schema,
- read/write metadata,
- transaction rollback/commit smoke test,
- branch identity không bị lẫn giữa hai DO khác nhau.

## Command model

Mọi mutation nghiệp vụ từ M1 nên đi qua command semantics.

Hướng dự kiến:

```text
Client intent
   ↓
CommandEnvelope
   ↓
Branch Durable Object
   ↓
Idempotency check
   ↓
Domain validation
   ↓
Transactional mutation
   ↓
ProcessedCommand + DomainEvent
   ↓
Response / realtime propagation
```

Không triển khai full event sourcing. Domain events dùng cho audit, realtime/sync và integration needs, trong khi current state vẫn được materialize trong SQLite.

Persistent local outbox của desktop chưa cần ở M1 online, nhưng command ID/idempotency semantics phải tồn tại từ đầu để M5 không buộc rewrite API.

## Shared packages

### `packages/contracts`

Chỉ chứa contract dùng chung giữa Worker/Desktop/Mobile:

- API request/response schemas,
- command envelopes,
- event envelopes,
- enum/union contract,
- runtime validation schemas khi thêm Zod.

Không chứa React/Electron/Cloudflare implementation.

### `packages/domain`

Chứa pure business rules:

- money/time primitives,
- pricing calculations,
- bill/table-session state transitions,
- validation không phụ thuộc transport/database.

Không import React, Electron, Wrangler hoặc D1.

### `packages/shared`

Chứa pure utility thật sự generic. Không dùng `shared` như nơi đổ code không biết đặt đâu.

## Auth và session

Các nguyên tắc đã chốt ở foundation:

- Không lưu raw session token; chỉ lưu lookup/validation hash.
- PIN credential chưa nằm trong migration 0001.
- PIN hashing/rate limiting/lockout phải được thiết kế cùng AuthGate.
- Session luôn phải gắn với tenant, branch, user, membership và device.

### Invariant cần harden trước D1 remote

Database hiện đảm bảo các foreign key cùng tenant, nhưng cần chốt cách enforce mạnh hơn:

```text
session.membership
  must belong to
session.tenant + session.branch + session.user

session.device
  must belong to
session.tenant + session.branch
```

Khuyến nghị enforce bằng composite unique/composite foreign key nếu D1/SQLite schema vẫn giữ model hiện tại.

## Timestamp policy

Các bảng D1 hiện dùng text timestamp và `CURRENT_TIMESTAMP` cho default create/update value.

Lưu ý:

- `DEFAULT CURRENT_TIMESTAMP` không tự update `updated_at` khi row thay đổi.
- Repository/service layer phải set `updated_at` trong UPDATE.
- Trước khi nhiều module bắt đầu dùng timestamp, cần thống nhất format UTC ở persistence và chỉ localize khi hiển thị.

## Offline boundary

Offline không được triển khai sớm hơn khi online command flow chưa ổn định.

M5 dự kiến mới thêm:

```text
Desktop local SQLite replica
        +
Persistent command outbox
        +
Sync cursor/protocol
        +
Conflict/takeover matrix
```

Điều này giữ M0/M1 đủ nhỏ nhưng vẫn tránh thiết kế API ngõ cụt.

## Printing boundary

Printing chạy trong desktop main-side infrastructure, không trong renderer.

MVP ưu tiên:

- Windows driver/spooler,
- print agent/service abstraction,
- template cố định hoặc parameterized,
- idempotent/retryable print jobs.

Không xây drag/drop print-template builder ở MVP.

## Update boundary

Desktop binary và operational data phải tách rời.

Định hướng sau:

```text
Mac/dev
  ↓
GitHub
  ↓
CI Windows runner
  ↓
electron-builder / NSIS
  ↓
Release channel (GitHub Releases hoặc R2)
  ↓
Windows POS updater
```

Update không được xóa local database và không nên force restart trong lúc đang có active bill/session.

## Nguyên tắc không phá vỡ

1. D1 = control plane.
2. Branch DO = operational single-writer boundary.
3. Renderer không có quyền Node/Electron trực tiếp.
4. Command semantics có từ M1.
5. Offline persistence đến sau online vertical slice.
6. Mobile đến sau desktop flow ổn định.
7. Không đưa secret/raw auth credential vào client-visible state hoặc database tùy tiện.
8. Schema production/pilot chỉ thay đổi bằng migration có review.
