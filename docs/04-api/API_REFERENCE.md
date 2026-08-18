# API Reference - Cloudflare Worker

Cập nhật: **2026-08-19**

Cloudflare Worker sử dụng Hono framework làm cổng API gateway cho toàn bộ hệ thống Billiard Management.

---

## 1. Cơ chế Xác thực Header (Authentication Headers)

1. **Thiết bị (Device Auth):**
   ```http
   Authorization: Device <deviceId>.<deviceSecret>
   ```
2. **Phiên làm việc (Session Auth):**
   ```http
   Authorization: Bearer <sessionToken>
   ```
3. **Chẩn đoán hệ thống (System Diagnostics Auth):**
   ```http
   Authorization: Bearer <systemDiagnosticsToken>
   ```

---

## 2. Danh sách Endpoints

### 2.1. Public / Health
- `GET /`: Thông tin dịch vụ cơ bản.
- `GET /api/health`: Kiểm tra trạng thái sống của Worker (`{ status: "ok" }`).

### 2.2. Thiết bị (Devices)
- `POST /api/devices/activate`:
  - **Mô tả:** Kích hoạt hoặc kích hoạt lại thiết bị qua mã Token 1 lần.
  - **Body:** `{ activationToken: string, installationId: string, name: string, platform: string, appVersion: string }`
  - **Phản hồi:** `{ deviceId: string, deviceSecret: string, store: { id: string, name: string, code: string } }`
- `GET /api/pos/context`:
  - **Yêu cầu:** `requireDevice`
  - **Phản hồi:** Thông tin `store` và `device` đã được xác thực phía server.

### 2.3. Xác thực Người dùng & Phiên (Auth)
- `GET /api/auth/employees`:
  - **Yêu cầu:** `requireDevice`
  - **Phản hồi:** Danh sách nhân viên trong Store được phép đăng nhập mã PIN (`[{ userId, displayName, username, roleId, roleName }]`).
- `POST /api/auth/login-password`:
  - **Yêu cầu:** `requireDevice`
  - **Body:** `{ identifier: string, password: string }` (Identifier là username hoặc email).
  - **Phản hồi:** `{ sessionToken: string, user: { id, displayName, username, roleId, roleName }, expiresAt: string }`
- `POST /api/auth/pin`:
  - **Yêu cầu:** `requireDevice`
  - **Body:** `{ userId: string, pin: string }` (PIN 4-6 chữ số).
  - **Phản hồi:** `{ sessionToken: string, user: { ... }, expiresAt: string }` (Nếu nhập sai quá giới hạn, trả về HTTP 429 kèm `Retry-After`).
- `GET /api/auth/session`:
  - **Yêu cầu:** `requireDevice` + `requireAuthSession`
  - **Phản hồi:** Thông tin phiên làm việc hiện tại, người dùng, vai trò và danh sách quyền hạn được cấp.
- `POST /api/auth/logout`:
  - **Yêu cầu:** `requireDevice` + `requireAuthSession`
  - **Phản hồi:** Thu hồi phiên làm việc trên D1 (`{ success: true }`).

### 2.4. Quản lý Nhân sự & Phân quyền (Staff)
- `GET /api/staff/roles`:
  - **Yêu cầu:** `requireDevice` + `requireAuthSession` + `requirePermission('role.manage')`
  - **Phản hồi:** Danh sách các vai trò và quyền trong Store.
- `GET /api/staff/employees`:
  - **Yêu cầu:** `requireDevice` + `requireAuthSession` + `requirePermission('staff.manage')`
  - **Phản hồi:** Danh sách toàn bộ nhân viên và tài khoản trong Store.
- `POST /api/staff/employees`:
  - **Yêu cầu:** `requireDevice` + `requireAuthSession` + `requirePermission('staff.manage')`
  - **Body:** `{ username: string, displayName: string, email?: string, roleId: string, pin?: string, password?: string }`
  - **Phản hồi:** Tạo nhân viên mới kèm mật khẩu/mã PIN.

### 2.5. Bàn & POS (Tables & Table Types)
- `GET /api/pos/table-types`:
  - **Yêu cầu:** `requireDevice` + `requireAuthSession` + `requirePermission('table.view')`
  - **Phản hồi:** Danh sách các loại bàn trong Store DO (`[{ id, name, description, sortOrder, status }]`).
- `GET /api/pos/tables`:
  - **Yêu cầu:** `requireDevice` + `requireAuthSession` + `requirePermission('table.view')`
  - **Phản hồi:** Danh sách các bàn trong Store DO (`[{ id, tableTypeId, tableNumber, name, sortOrder, status }]`).
- `POST /api/pos/table-commands`:
  - **Yêu cầu:** `requireDevice` + `requireAuthSession` + `requirePermission('table.manage')`
  - **Body:** `CommandEnvelope` chứa command intent.
  - **Phản hồi:** Kết quả thực thi command từ Store DO.

### 2.6. Chẩn đoán hệ thống (System Diagnostics)
- `GET /api/system/db-health`: Kiểm tra kết nối D1 Control Plane.
- `GET /api/system/stores/:storeId/do-health`: Kiểm tra kết nối Store DO SQLite.
  - **Yêu cầu:** Bearer Token `SYSTEM_DIAGNOSTICS_TOKEN`. Nếu thiếu hoặc không hợp lệ, trả về HTTP 404 Fail-Closed.
