# ADR-001: Single Store, No Branch in V1

- Status: **Accepted and implemented in M0**
- Date: **2026-08-18**

## Context

Thiết kế foundation ban đầu dùng:

```text
Tenant
  ↓
Branch
  ↓
Branch Durable Object
```

với `branches`, `branch_id`, `branch_registry` và một operational Durable Object cho mỗi branch.

Sau khi rà lại nghiệp vụ thực tế, sản phẩm V1 được xác nhận phục vụ **một cửa hàng billiards tại một địa điểm vật lý** cho mỗi Store. Khái niệm branch không đem lại giá trị người dùng trong V1 nhưng làm tăng độ phức tạp của:

- schema,
- foreign keys,
- auth/session context,
- permission checks,
- API contracts,
- UI context switching,
- Durable Object routing,
- offline/sync sau này.

Branch-based migration chỉ từng được chạy local và đã được thay thế trước khi có remote production data.

## Decision

V1 loại bỏ branch hoàn toàn.

```text
Store = tenant boundary
```

Kiến trúc đã triển khai ở foundation:

```text
Store
  ├── users / roles / devices / auth in D1 control plane
  └── StoreDurableObject
         └── SQLite operational data plane
```

Operational DO được route theo Store identity:

```text
STORE_DO.idFromName(storeId)
```

Không tồn tại branch selector/context trong product V1.

## Implementation status

Quyết định này đã được hiện thực hóa trong M0:

- `0001_init_control_plane.sql` đã được rewrite thành Store-based schema.
- `branches`, `branch_id`, `branch_registry`, `BRANCH_DO` và `BranchDurableObject` không còn thuộc architecture hiện hành.
- D1 control plane hiện có `stores`, `users`, `roles`, `permission_catalog`, `role_permissions`, `store_memberships`, `devices`, `auth_sessions`, `store_registry`.
- `STORE_DO` và `StoreDurableObject` đã được tạo với SQLite storage.
- Store DO lưu và khóa `store_id` để ngăn một DO bị tái sử dụng cho Store khác.
- Store DO có schema migration/versioning runner riêng.
- Automated tests đã kiểm tra read/write, transaction commit/rollback, isolation, identity lock và migration guards.
- Shared contracts và CI quality gate đã được thêm trước khi đóng M0.

## Consequences

### Positive

- Schema đơn giản hơn.
- Auth/session không cần branch invariants.
- Permission context đơn giản hơn.
- Một Store có một single-writer operational boundary rõ.
- Desktop và Mobile cùng thao tác trên một Store state.
- Giảm số lớp routing và conflict source.
- Phù hợp scope thực tế thay vì over-engineering cho tương lai chưa xác nhận.

### Ongoing requirements

Từ M1 trở đi:

- Mọi request nghiệp vụ phải resolve Store context đáng tin cậy ở server side.
- Device phải thuộc Store trước khi được dùng làm execution context.
- Employee/Auth session/permission đều Store-scoped.
- Mutation nghiệp vụ route tới đúng Store DO.
- Không cho client tự khai `storeId` rồi mặc nhiên tin cậy cho mutation.
- Schema production/pilot chỉ đổi qua migration được review.

## Future multi-store

Nếu sau này một chủ sở hữu cần quản lý nhiều địa điểm, không hồi sinh branch một cách tự động.

Sẽ đánh giá riêng các lựa chọn như:

- một owner identity có membership ở nhiều Store độc lập,
- một organization/group layer bao quanh nhiều Store,
- entitlement cho chain management.

Mỗi Store vẫn có thể tiếp tục là data-isolation/operational boundary độc lập.

## Guardrail

Không thêm lại `branch_id` vào schema/API chỉ vì lý do “có thể cần sau này” nếu chưa có user requirement và ADR mới thay thế quyết định này.