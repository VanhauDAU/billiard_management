# ADR-002 - Command identity comes from trusted server context

- Status: **Accepted**
- Date: **2026-08-18**

## Context

M1.1 đã thiết lập Device + Store trust boundary:

```text
Device credential
      ↓
Worker authentication
      ↓
trusted DeviceContext
      ↓
trusted Store
```

Shared `CommandEnvelope` foundation ban đầu chứa cả:

```text
storeId
deviceId
actorId
```

Nếu giữ các field identity này trong request envelope từ client, code business ở các milestone sau rất dễ vô tình dùng chúng làm routing/audit/security authority. Điều đó mâu thuẫn trực tiếp với nguyên tắc M1.1 rằng Store/Device/Actor phải được resolve server-side.

`issuedAt` cũng do client tạo. Nó hữu ích cho intent/order/offline diagnostics nhưng không phải authoritative server clock.

## Decision

### Client command envelope

Shape nhận từ untrusted client chỉ chứa intent metadata:

```ts
{
  commandId,
  issuedAt,
  commandType,
  payload
}
```

Client command schema là strict. Field identity thừa như `storeId`, `deviceId`, `actorId` không được chấp nhận như authority.

`issuedAt` là **client-claimed intent timestamp**. Online pricing, open-session time, payment time, audit execution time và permission decisions không được dùng `issuedAt` làm nguồn thời gian sự thật. Server phải dùng server time; offline milestone sau phải có clock/sync/boot-anchor policy riêng trước khi client time có ý nghĩa nghiệp vụ.

### Trusted command envelope

Sau khi Worker resolve Device/Auth context, server có thể enrich thành internal envelope:

```ts
{
  commandId,
  issuedAt,
  commandType,
  payload,
  storeId,
  deviceId,
  actorId
}
```

Trong đó:

- `storeId` lấy từ trusted Store context.
- `deviceId` lấy từ authenticated Device context.
- `actorId` lấy từ authenticated Employee/Auth session.

`TrustedCommandEnvelope` là internal server shape, không phải request contract để client tự khai identity.

## Consequences

### Positive

- Tránh tenant spoofing qua command payload/envelope.
- Tránh audit ghi sai actor/device do tin client metadata.
- Business handlers nhận identity đã được xác thực.
- Tránh dùng clock client làm authoritative time cho tính giờ/tính tiền online.
- Offline/outbox command vẫn có `commandId` và `issuedAt` để idempotency/sync nhưng không trở thành security/time authority.

### Trade-off

Offline client có thể cần giữ local display metadata về actor/device/store và thời điểm intent để UX hoặc diagnostics, nhưng metadata đó phải nằm ngoài authoritative command identity/time và luôn được server đối chiếu/enrich khi sync.

## Guardrails

1. Route/handler không lấy Store authority từ `payload.storeId` hoặc client envelope.
2. Device identity không lấy từ request body; lấy từ Device authentication middleware/context.
3. Actor identity không lấy từ request body; lấy từ Employee/Auth session context.
4. Permission enforcement dùng trusted actor/membership/role context.
5. Event/audit record dùng server-enriched identity và server execution timestamps.
6. `issuedAt` không dùng làm authoritative online clock cho session/pricing/payment.
7. Nếu business payload thật sự cần tham chiếu một entity Store-scoped, entity đó vẫn phải được kiểm tra thuộc trusted Store trước mutation.

## Implementation

`packages/contracts/src/commands/command-envelope.ts` định nghĩa:

- `CommandEnvelopeSchema` / `CommandEnvelope` cho client intent.
- `TrustedCommandEnvelopeSchema` / `TrustedCommandEnvelope` cho server-internal enriched command.

Worker tests verify client envelope rejects `storeId/deviceId/actorId` and trusted envelope accepts server-enriched identity.

Quyết định này phải được áp dụng từ M1.2/M1.3 trở đi trước khi triển khai Table/Session/Bill/Payment commands.
