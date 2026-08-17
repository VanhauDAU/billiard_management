# ADR-001: Single Store, No Branch in V1

- Status: **Accepted**
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

Migration branch-based mới chỉ được chạy local, chưa apply D1 remote.

## Decision

V1 loại bỏ branch hoàn toàn.

```text
Store = tenant boundary
```

Target architecture:

```text
Store
  ├── users / roles / devices / auth in D1 control plane
  └── StoreDurableObject
         └── operational SQLite
```

Operational DO được route bằng:

```text
STORE_DO.idFromName(storeId)
```

Không tồn tại branch selector/context trong product V1.

## Consequences

### Positive

- Schema đơn giản hơn.
- Auth/session không cần branch invariants.
- Permission context đơn giản hơn.
- Một Store có một single-writer operational boundary rõ.
- Desktop và Mobile cùng thao tác trên một Store state.
- Giảm số lớp routing và conflict source.
- Phù hợp scope thực tế thay vì over-engineering cho tương lai chưa xác nhận.

### Required refactor

Migration `0001_init_control_plane.sql` hiện tại phải rewrite trước remote:

- xóa `branches`,
- xóa mọi `branch_id`,
- xóa `branch_registry`,
- đổi membership/device/session sang Store-scoped,
- tạo Store registry nếu cần provision/data-plane metadata.

Branch DO chưa được triển khai nên không có data-plane migration cần chuyển đổi.

### Future multi-store

Nếu sau này một chủ sở hữu cần quản lý nhiều địa điểm, không hồi sinh branch một cách tự động.

Sẽ đánh giá riêng các lựa chọn như:

- một owner identity có membership ở nhiều Store độc lập,
- một organization/group layer bao quanh nhiều Store,
- entitlement cho chain management.

Mỗi Store vẫn có thể tiếp tục là data-isolation/operational boundary độc lập.

## Guardrail

Không thêm lại `branch_id` vào schema/API chỉ vì lý do “có thể cần sau này” nếu chưa có user requirement và ADR mới thay thế quyết định này.
