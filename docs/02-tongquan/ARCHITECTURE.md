# Kiến trúc hệ thống

Cập nhật: **2026-08-19**

> V1 không có mô hình `branch`. Một `Store` là một cửa hàng billiards tại một địa điểm vật lý và đồng thời là tenant/data-isolation boundary.

Scope nghiệp vụ: [`../01-phantich/SYSTEM_SCOPE_V1.md`](../01-phantich/SYSTEM_SCOPE_V1.md).  
Tiến độ: [`PROGRESS.md`](PROGRESS.md).  
Roadmap: [`ROADMAP.md`](ROADMAP.md).

Quyết định kiến trúc (ADR):
- [`../01-phantich/ADR-001-single-store-no-branch.md`](../01-phantich/ADR-001-single-store-no-branch.md)
- [`../01-phantich/ADR-002-command-trust-boundary.md`](../01-phantich/ADR-002-command-trust-boundary.md)
- [`../01-phantich/ADR-003-device-installation-single-store.md`](../01-phantich/ADR-003-device-installation-single-store.md)

---

## 1. Trạng thái kiến trúc hiện tại

Đã hoàn thành các tầng cốt lõi:
- **M0 - Foundation:** Electron Desktop POS, Worker Hono API, D1 Control Plane, Store Durable Object SQLite.
- **M1.1 - Device Identity & Store Context:** Kích hoạt thiết bị 1 lần, 256-bit secret, `safeStorage`, `DeviceGate`.
- **M1.2 - Employee PIN & AuthGate:** PIN 4-6 chữ số (PBKDF2-SHA256), server-side lockout, `AuthSession`.
- **M1.3 - Permission Context & RBAC:** `role_permissions`, `PermissionContext`, `requirePermission`, fail-closed enforcement.
- **M1.4 - Table & TableType Foundation:** Store DO migration 002, Table Command Executor, RPC, REST endpoints, Desktop table workspace.
- **Auth & Staff Refactor:** Hỗ trợ đăng nhập kép (Tài khoản Quản trị với mật khẩu + Mã PIN Nhân viên ca làm việc), quản lý nhân viên và danh mục quyền hạn mở rộng (30+ permissions).

---

## 2. Sơ đồ tổng thể hệ thống

```text
┌─────────────────────────┐          ┌─────────────────────────┐
│ Windows Desktop POS     │          │ Mobile PWA (deferred)   │
│ Electron + React + TS   │          │ React + Vite            │
└────────────┬────────────┘          └────────────┬────────────┘
             │                                     │
             │ Preload Bridge & Typed IPC          │
             ▼                                     ▼
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Worker Gateway (Hono)                             │
│ - Security Middlewares: requireDevice, requireAuthSession,   │
│   requirePermission, requireSystemDiagnostics                │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐   ┌───────────────────────────┐
│ D1 Control Plane             │   │ Store Durable Object      │
│ (billiards-control-plane)    │   │ (one DO per Store)        │
│ ──────────────────────────── │   │ ───────────────────────── │
│ - stores, users, roles       │   │ - SQLite operational DB   │
│ - permission_catalog         │   │ - table_types             │
│ - role_permissions           │   │ - billiard_tables         │
│ - store_memberships          │   │ - table_commands          │
│ - devices                    │   │ - table_sessions (M1.5)   │
│ - user_password_credentials  │   │ - pricing_configs (M1.5)  │
│ - employee_pin_credentials   │   │ - products & bills (M1.6) │
│ - employee_pin_auth_state    │   │ - command executor & RPC  │
│ - auth_sessions              │   │                           │
│ - store_registry             │   │                           │
└──────────────────────────────┘   └───────────────────────────┘
```

---

## 3. Các nguyên tắc và ranh giới bảo mật (Trust Boundaries)

### 3.1. Store là Tenant Boundary duy nhất
- Dữ liệu Store A hoàn toàn cách ly với Store B.
- `storeId` do client gửi lên **không bao giờ** được tin cậy trực tiếp.
- Mọi request nghiệp vụ đều bắt buộc phải thông qua `DeviceContext` và `AuthContext` đã được server xác thực để suy ra `storeId` hợp lệ.

### 3.2. Ranh giới Desktop Process (Electron)

```text
Renderer Process (React UI)
       │ window.desktopApi (Preload contextBridge)
       ▼
Main Process (Node.js / Electron)
       ├── Quản lý định danh thiết bị (installationId)
       ├── Lưu trữ thông tin đăng nhập mã hóa qua async safeStorage:
       │   ├── device/credential.bin
       │   └── auth/session.bin
       ├── Giao tiếp mạng an toàn với Cloudflare Worker qua HTTPS
       └── Giao tiếp phần cứng (máy in bill 80mm, sau này là local SQLite)
```

**Nguyên tắc an toàn trên Desktop:**
- `contextIsolation: true`, `nodeIntegration: false`, sandbox bật.
- Renderer **không bao giờ** nhận raw `deviceSecret` hay raw `sessionToken`.
- IPC được định kiểu chặt chẽ, kiểm tra `senderFrame` để từ chối các request không hợp lệ.
- Ứng dụng khi đóng gói (packaged) bắt buộc chỉ giao tiếp qua backend HTTPS.

### 3.3. Mô hình xác thực kép (Dual Auth Model)
1. **Quản trị viên / Chủ quán (Owner / Manager):**
   - Đăng nhập bằng Tên đăng nhập (hoặc Email) + Mật khẩu.
   - Mật khẩu được băm bằng PBKDF2-SHA256 với 100,000 iterations và salt riêng biệt.
2. **Nhân viên / Thu ngân (Staff / Cashier):**
   - Đăng nhập nhanh tại quầy POS bằng việc chọn tên nhân viên và nhập mã PIN (4-6 chữ số).
   - Mã PIN băm bằng PBKDF2-SHA256.
   - Cơ chế khóa tài khoản tự động phía server (`employee_pin_auth_state`) khi nhập sai nhiều lần.
3. **AuthSession:**
   - Phiên làm việc trả về `sessionToken` ngẫu nhiên có độ dài an toàn cao.
   - D1 lưu trữ SHA-256 hash của token và liên kết chặt chẽ với `Store + User + Membership + Device + Credential Version`.
   - Toàn bộ phản hồi xác thực đều có header `Cache-Control: no-store`.

### 3.4. Mô hình phân quyền theo vai trò (RBAC) - M1.3
- Danh mục hơn 30+ quyền hạn (`permission_catalog`) được chia nhóm rõ ràng: bàn (`tables`), hóa đơn (`invoices`), thực đơn (`menus`), mặt hàng (`products`), danh mục (`categories`), khách hàng (`customers`), quản trị (`store`).
- `role_permissions` xác định các quyền được cấp cho từng vai trò trong Store.
- Khi người dùng thực hiện yêu cầu, `requirePermission(permissionKey)` sẽ truy vấn quyền hạn thực tế của vai trò hiện tại trong Store.
- Mọi trường hợp không có quyền đều bị từ chối với mã lỗi `403 Forbidden` (Fail-Closed).

---

## 4. D1 Control Plane Schema

D1 quản lý dữ liệu định danh, tài khoản, vai trò và thiết bị:

- **Migrations hiện có:**
  1. `0001_init_control_plane.sql`: Cấu trúc ban đầu (stores, users, roles, store_memberships, devices, permissions).
  2. `0002_add_device_credentials.sql`: Quản lý secret của thiết bị, bảng `device_activation_tokens`.
  3. `0003_enforce_global_device_installation.sql`: Ràng buộc duy nhất `installation_id` trên toàn hệ thống (ADR-003).
  4. `0004_add_employee_pin_credentials.sql`: Quản lý mã PIN nhân viên và trạng thái khóa PIN.
  5. `0005_add_user_password_and_store_permissions.sql`: Quản lý mật khẩu quản trị và mở rộng danh mục quyền hạn.

---

## 5. Store Durable Object (Operational Data Plane)

Mỗi Store sở hữu một Durable Object riêng biệt (`STORE_DO.idFromName(storeId)`), chứa một cơ sở dữ liệu SQLite độc lập cho vận hành tốc độ cao và đảm bảo tính nhất quán (Strong Consistency).

### Schema Store DO
- **`migration-001-foundation.ts`**: Thiết lập schema versioning và kiểm tra tính toàn vẹn `store_id`.
- **`migration-002-table-foundation.ts`**:
  - `table_types`: Danh mục loại bàn (`id`, `store_id`, `name`, `description`, `sort_order`, `status`).
  - `billiard_tables`: Danh sách bàn (`id`, `store_id`, `table_type_id`, `table_number`, `name`, `sort_order`, `status`).
  - `table_commands`: Bảng nhật ký ghi nhận các lệnh thay đổi trạng thái bàn, phục vụ deduplication và audit.

### Table Command Executor & Idempotency
- Mọi thay đổi về bàn đều phải đóng gói thành command gửi qua `executeTableCommand`.
- Hệ thống tính toán `fingerprint` từ command payload và đối chiếu với `table_commands`. Nếu gặp `command_id` trùng lặp với cùng nội dung, DO trả lại kết quả đã thực thi trước đó mà không thực hiện lại (Idempotent).

---

## 6. Luồng dữ liệu và thực thi lệnh (Command Trust Chain)

```text
Untrusted Client Intent:
{ commandId, issuedAt, commandType, payload }
                       │
                       ▼ (Gửi qua HTTPS kèm Device & Auth Credentials)
Worker Gateway:
1. Xác thực Device credential -> Trích xuất Store đáng tin cậy
2. Xác thực AuthSession -> Trích xuất User, Membership, Role
3. Kiểm tra quyền qua requirePermission(...)
4. Làm giàu dữ liệu thành TrustedCommandEnvelope:
   { commandId, issuedAt, commandType, payload, storeId, deviceId, actorId }
                       │
                       ▼ (Store DO RPC)
Store Durable Object:
1. Kiểm tra tính toàn vẹn storeId của Durable Object
2. Kiểm tra Idempotency trong SQLite
3. Thực thi nghiệp vụ bên trong transactionSync
4. Ghi nhận kết quả vào table_commands và trả về phản hồi
```
