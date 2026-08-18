# Tiến độ phát triển

Cập nhật: **2026-08-19**

## Tổng quan

Dự án đã hoàn thành các lớp nền tảng cốt lõi về định danh, xác thực, phân quyền và cấu trúc bàn:

- **M0 Foundation:** ✅ Done.
- **M1.1 Device identity + Store execution context:** ✅ Done.
- **M1.2 Employee PIN authentication + AuthGate:** ✅ Done.
- **M1.3 Permission Context & RBAC:** ✅ Done.
- **M1.4 Table Foundation & Table Types:** ✅ Done.
- **Auth & Store Management Refactor:** ✅ Done (Hỗ trợ đăng nhập kép Quản trị/Nhân viên, quản lý nhân viên, phân quyền mở rộng).
- **M1.5 Pricing Foundation + Open TableSession:** ⏭ Next.

Scope V1 đã khóa: [`../01-phantich/SYSTEM_SCOPE_V1.md`](../01-phantich/SYSTEM_SCOPE_V1.md).  
Kiến trúc: [`ARCHITECTURE.md`](ARCHITECTURE.md).  
Roadmap/gate: [`ROADMAP.md`](ROADMAP.md).

## Trạng thái các Milestone

| Hạng mục / Milestone | Trạng thái | Ghi chú |
|---|---|---|
| **M0 - Foundation** | ✅ | pnpm monorepo, Electron Desktop, Worker Hono, D1, Store DO SQLite, Contracts, CI |
| **M1.1 - Device + Store Context** | ✅ | One-time token, 256-bit hashed secret, safeStorage, DeviceGate, global installation |
| **M1.2 - Employee PIN Auth** | ✅ | PBKDF2-SHA256, lockout, AuthSession, safeStorage, AuthGate |
| **M1.3 - Permission Context** | ✅ | Role-based permissions, `PermissionContext`, `requirePermission`, fail-closed |
| **M1.4 - Table Foundation** | ✅ | Store DO migration 002, table command executor & RPC, REST APIs, Desktop workspace |
| **Auth & Staff Refactor** | ✅ | Quản trị viên (User/Password), Nhân viên (Mã PIN), Quản lý nhân viên, Phân quyền mở rộng |
| **M1.5 - Pricing + Open Session** | ⏭ Next | Bảng giá giờ/khung giờ, lệnh OpenTableSession, server-side timer |
| **M1.6 - Product + Bill + Payment** | ⬜ | Menu, add items, bill lifecycle, cash/bank payment, finalize |
| **M2 - Business Completeness** | ⬜ | Chuyển bàn, gộp bill, chỉnh sửa giờ audit, quản trị toàn diện |
| **M3 - Printing 80mm** | ⬜ | Adapter in Windows, template editor, preview, QR chuyển khoản |
| **M4 - Mobile PWA + Realtime** | ⬜ | Đồng bộ thời gian thực qua Worker/Store DO, giao diện mobile |
| **M5 - Offline / Sync** | ⬜ | SQLite replica tại Desktop, persistent outbox, cursor sync |
| **M6 - Reports & Pilot** | ⬜ | Báo cáo doanh thu, audit logs, pilot checklist |

---

## Chi tiết các Milestone đã hoàn thành

### M0 - Foundation (✅ Done)

- Cấu trúc monorepo: `apps/desktop`, `apps/worker`, `apps/mobile`, `packages/contracts`, `packages/domain`, `packages/shared`, `packages/ui`.
- D1 Control Plane (`billiards-control-plane`) cho dữ liệu định danh & phân quyền.
- Store Durable Object SQLite (`StoreDurableObject`) là operational single-writer boundary cho từng Store.
- Store DO migration/versioning runner (`transactionSync`).
- CI pipeline kiểm tra typecheck monorepo, Vitest Worker, và Electron Desktop build.

### M1.1 - Device identity + Store context (✅ Done)

- Cơ chế kích hoạt thiết bị một lần (one-time activation token), không lưu raw token.
- Device secret 256-bit; D1 chỉ lưu SHA-256 hash.
- Uniqueness constraint: một `installationId` chỉ thuộc tối đa một Store (chống cross-tenant spoofing).
- Middleware `requireDevice` phân giải `DeviceContext` và `Store` hoàn toàn phía server.
- Desktop Main process lưu Device credential vào secure storage (`safeStorage`).
- Giao diện `DeviceGate` với các trạng thái kích hoạt, lỗi và sẵn sàng.

### M1.2 - Employee PIN authentication + AuthGate (✅ Done)

- Migration D1 `0004_add_employee_pin_credentials.sql`.
- Mã PIN 4-6 số, giữ nguyên số 0 ở đầu (`0012`).
- Mã hóa PIN bằng PBKDF2-SHA256 với salt ngẫu nhiên và credential version.
- Server-side failure window và escalating lockout chống brute-force PIN.
- Session Token ngẫu nhiên (D1 lưu hash) liên kết `Store + User + Membership + Device + PIN Credential Version`.
- Middleware `requireAuthSession` trích xuất danh tính nhân viên đáng tin cậy.
- Thu hồi phiên (revocation) tự động khi kích hoạt lại thiết bị hoặc thay đổi mã PIN.
- Desktop lưu session an toàn qua `safeStorage` (Renderer không nhận raw token).

### M1.3 - Permission Context (✅ Done)

- Bảng `role_permissions` và `permission_catalog` trong D1.
- `PermissionContext` giải quyết danh sách quyền từ vai trò của nhân viên trong Store.
- Middleware `requirePermission(permissionKey)` bảo vệ các endpoint nhạy cảm (fail-closed, 403 Forbidden nếu thiếu quyền).
- Client không được phép tự khai báo hoặc truyền quyền hạn trong payload.
- Kiểm tra tính hợp lệ của Store Membership và Role ở mỗi request nghiệp vụ.
- Bộ automated tests bao quát: cấp quyền, từ chối khi thiếu quyền, giả mạo quyền cross-store, membership bị khóa/hủy.

### M1.4 - Table & TableType Foundation (✅ Done)

- Migration Store DO `migration-002-table-foundation.ts`:
  - `table_types`: định nghĩa loại bàn (Bàn Líp, Bàn Lỗ, Carom,...), cấu hình động theo quán.
  - `billiard_tables`: danh sách bàn, tên hiển thị, số bàn, thứ tự hiển thị, trạng thái (`available`, `playing`, `disabled`).
  - `table_commands`: lưu log command đã thực thi, phục vụ idempotency và audit.
- Table Command Executor với cơ chế tính fingerprint và deduplication theo `command_id`.
- Store DO RPC interface: `executeTableCommand`, `listTables`, `listTableTypes`.
- REST API bảo vệ phía Worker:
  - `GET /api/pos/tables` (yêu cầu `table.view`)
  - `GET /api/pos/table-types` (yêu cầu `table.view`)
  - `POST /api/pos/table-commands` (yêu cầu `table.manage`)
- Desktop Client:
  - IPC channels và preload API bridge an toàn (`desktopApi.tables.*`).
  - Màn hình Quản lý bàn & Danh mục bàn với khả năng tạo mới, đổi tên, thay đổi thứ tự và chuyển đổi trạng thái bàn.

### Auth & Staff Management Refactor (✅ Done)

- Migration D1 `0005_add_user_password_and_store_permissions.sql`:
  - Bảng `user_password_credentials` lưu mật khẩu Quản trị (PBKDF2-SHA256).
  - Bổ sung danh mục quyền hạn mở rộng (30+ permissions) phục vụ quản lý toàn diện.
- Xác thực kép linh hoạt:
  - **Quản lý / Chủ quán:** Đăng nhập bằng Tên đăng nhập/Email + Mật khẩu.
  - **Nhân viên / Thu ngân:** Chọn tài khoản + Nhập mã PIN ca làm việc.
- Staff Service & Routes (`/api/staff/*`) hỗ trợ tạo nhân viên, phân vai trò và cấp mã PIN.
- Desktop App: Giao diện `LoginPage` hiện đại, hỗ trợ chuyển đổi giữa Đăng nhập Quản trị và Mã PIN Nhân viên.

---

## CI & Automated Tests

Bộ kiểm thử hiện tại gồm **19 test files (171 tests)** chạy tự động trong CI:

```bash
pnpm run ci
```

Bao gồm các bài test trọng yếu:
1. `pin-credential.test.ts` (25 tests): KDF PIN, salt, versioning, timing attack prevention.
2. `auth-contract.test.ts` (25 tests): Zod contracts cho auth, input parsing & validation.
3. `auth-service.test.ts` (20 tests): PIN login, lockout logic, store membership check.
4. `session-credential.test.ts` (18 tests): Tạo, hash, validate token AuthSession.
5. `auth-routes.test.ts` (14 tests): Luồng HTTP /api/auth/pin, /api/auth/session, /api/auth/logout.
6. `store-schema-table-foundation.test.ts` (11 tests): Migration bảng bàn, khóa ngoại, ràng buộc Store DO.
7. `table-contracts.test.ts` (10 tests): Zod schemas cho Table & TableType commands.
8. `permission-context.test.ts` (9 tests): Middleware phân quyền, role checks, fail-closed RBAC.
9. `device-context.test.ts` (9 tests): Xác thực Device credential, resolve Store context.
10. `store-durable-object.test.ts` (9 tests): Storage SQLite, transaction, identity guards.
11. `store-table-rpc.test.ts` (5 tests): Thực thi table commands, fingerprint & idempotency trong DO.
12. `device-credential.test.ts` (4 tests): KDF & hash credential của thiết bị.
13. `system-diagnostics.test.ts` (3 tests): Bearer token bảo vệ diagnostic routes.
14. `command-envelope.test.ts` (3 tests): Client vs Server trusted command envelope.
15. `auth-cache-control.test.ts` (2 tests): Kiểm tra header `Cache-Control: no-store`.
16. `cross-store-device.test.ts` (1 test): Ngăn chặn cùng installationId trên 2 Store.
17. `device-session-revocation.test.ts` (1 test): Thu hồi session khi thiết bị kích hoạt lại.
18. `password-auth.test.ts` (1 test): Xác thực mật khẩu PBKDF2 của Quản trị viên.
19. `table-api.test.ts` (1 test): HTTP API quản lý bàn qua Worker.

---

## Kế hoạch tiếp theo: M1.5 - Pricing + Open TableSession

Nhiệm vụ trọng tâm tiếp theo:
1. **Pricing Foundation:** Cấu hình giá theo loại bàn, khung giờ (giờ cao điểm / thường), ngày trong tuần.
2. **TableSession Schema trong Store DO:** Lưu phiên chơi gồm `session_id`, `table_id`, `start_time`, `pricing_snapshot`, `status`.
3. **Lệnh OpenTableSession:** Command mở bàn với server-side timestamp, ngăn chặn mở đúp trên cùng một bàn.
4. **Desktop POS Session Workspace:** Hiển thị sơ đồ bàn với trạng thái đang chơi/trống, đồng hồ tính giờ trực quan theo thời gian server.
