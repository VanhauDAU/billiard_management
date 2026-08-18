# D1 Control Plane Database

Cập nhật: **2026-08-19**

D1 Control Plane (`billiards-control-plane`) là cơ sở dữ liệu quan hệ Cloudflare D1 chịu trách nhiệm lưu trữ dữ liệu định danh, tài khoản, vai trò, quyền hạn, thiết bị và phiên làm việc của toàn bộ hệ thống.

---

## 1. Danh sách Migrations

| Migration | Tên File | Mục đích |
|---|---|---|
| 0001 | `0001_init_control_plane.sql` | Khởi tạo bảng stores, users, roles, permissions, store_memberships, devices, auth_sessions, store_registry |
| 0002 | `0002_add_device_credentials.sql` | Quản lý secret mã hóa của thiết bị, bảng `device_activation_tokens` |
| 0003 | `0003_enforce_global_device_installation.sql` | Ràng buộc Unique `installation_id` toàn cầu (ADR-003) |
| 0004 | `0004_add_employee_pin_credentials.sql` | Quản lý mã PIN nhân viên và trạng thái lockout chống brute-force |
| 0005 | `0005_add_user_password_and_store_permissions.sql` | Quản lý mật khẩu quản trị và mở rộng danh mục quyền hạn (30+ permissions) |

---

## 2. Chi tiết các bảng dữ liệu (Tables Schema)

### 2.1. Cửa hàng & Định danh
- **`stores`**: Lưu thông tin cửa hàng (`id`, `code`, `name`, `status`, `created_at`, `updated_at`). Store là tenant boundary duy nhất.
- **`users`**: Người dùng trong hệ thống (`id`, `store_id`, `username`, `email`, `display_name`, `status`). Khóa chính kết hợp `(store_id, id)`.
- **`store_memberships`**: Liên kết người dùng với cửa hàng và vai trò (`id`, `store_id`, `user_id`, `role_id`, `status`).

### 2.2. Vai trò & Phân quyền (RBAC)
- **`roles`**: Danh sách vai trò trong Store (`id`, `store_id`, `role_key`, `name`, `description`, `is_system`, `status`).
- **`permission_catalog`**: Danh mục toàn bộ quyền hạn trong hệ thống (`permission_key`, `group_key`, `display_name`, `description`, `sort_order`).
- **`role_permissions`**: Gán quyền cho vai trò trong Store (`id`, `store_id`, `role_id`, `permission_key`).

### 2.3. Thiết bị & Kích hoạt (Devices)
- **`devices`**: Thiết bị POS đã được kích hoạt (`id`, `store_id`, `installation_id`, `device_code`, `name`, `platform`, `app_version`, `status`, `last_seen_at`).
  - Ràng buộc: `UNIQUE (installation_id)` đảm bảo 1 thiết bị chỉ thuộc 1 Store tại một thời điểm.
- **`device_credentials`**: Chứa SHA-256 hash của device secret (`device_id`, `secret_hash`, `status`, `created_at`).
- **`device_activation_tokens`**: Token kích hoạt 1 lần (`token_hash`, `store_id`, `expires_at`, `consumed_at`, `status`).

### 2.4. Xác thực & Mật khẩu / Mã PIN
- **`user_password_credentials`**: Mật khẩu của Quản trị viên / Chủ quán:
  - `password_hash`, `password_salt`, `kdf_algorithm` (`pbkdf2-sha256`), `kdf_iterations` (100,000), `credential_version`, `status`.
- **`employee_pin_credentials`**: Mã PIN 4-6 số của nhân viên ca làm việc:
  - `pin_hash`, `pin_salt`, `kdf_algorithm` (`pbkdf2-sha256`), `kdf_iterations` (100,000), `credential_version`, `status`.
- **`employee_pin_auth_state`**: Quản lý số lần nhập sai và trạng thái khóa (Lockout):
  - `failed_attempts`, `locked_until`, `first_failed_at`, `last_failed_at`.
- **`auth_sessions`**: Phiên làm việc đã xác thực:
  - `session_token_hash`, `store_id`, `user_id`, `membership_id`, `device_id`, `role_id`, `credential_version`, `status`, `expires_at`.

---

## 3. Lệnh Vận hành D1 (CLI Commands)

### Áp dụng migration local:
```bash
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
```

### Kiểm tra tính toàn vẹn Foreign Key:
```bash
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

### Reset dữ liệu local:
```bash
rm -rf apps/worker/.wrangler/state
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
```
