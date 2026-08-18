# Tài Liệu Hệ Thống Billiard Management

Thư mục tài liệu kỹ thuật và nghiệp vụ được phân nhóm theo cấu trúc tiêu chuẩn:

---

## 📂 Danh mục tài liệu

### 1. [`01-phantich/`](01-phantich/) - Phân tích yêu cầu & Nghiệp vụ
- [`SYSTEM_SCOPE_V1.md`](01-phantich/SYSTEM_SCOPE_V1.md): Phạm vi nghiệp vụ V1 chính thức, mô hình quán, phân quyền, sơ đồ bàn, quy trình mở bàn & thanh toán.
- [`PRINTING_V1.md`](01-phantich/PRINTING_V1.md): Kiến trúc in bill nhiệt 80mm, mẫu in, QR chuyển khoản VietQR.
- [`ADR-001-single-store-no-branch.md`](01-phantich/ADR-001-single-store-no-branch.md): Quyết định 1 Store = 1 cửa hàng vật lý, không có branch trong V1.
- [`ADR-002-command-trust-boundary.md`](01-phantich/ADR-002-command-trust-boundary.md): Ranh giới danh tính và thời gian thực thi lệnh từ Server.
- [`ADR-003-device-installation-single-store.md`](01-phantich/ADR-003-device-installation-single-store.md): Ràng buộc 1 installation của app Desktop thuộc tối đa 1 Store.

### 2. [`02-tongquan/`](02-tongquan/) - Tổng quan Kiến trúc & Lộ trình
- [`ARCHITECTURE.md`](02-tongquan/ARCHITECTURE.md): Kiến trúc hệ thống tổng thể, Electron trust boundary, D1 Control Plane, Store Durable Object SQLite.
- [`ROADMAP.md`](02-tongquan/ROADMAP.md): Lộ trình triển khai các milestone từ M0 đến M6.
- [`PROGRESS.md`](02-tongquan/PROGRESS.md): Báo cáo tiến độ chi tiết, trạng thái hoàn thành và danh sách 171 automated tests.

### 3. [`03-database/`](03-database/) - Thiết kế Cơ sở dữ liệu
- [`D1_CONTROL_PLANE.md`](03-database/D1_CONTROL_PLANE.md): Schema cơ sở dữ liệu Cloudflare D1 (migrations 0001 - 0005), bảng biểu, khóa ngoại và chỉ mục.
- [`STORE_DURABLE_OBJECT_SQLITE.md`](03-database/STORE_DURABLE_OBJECT_SQLITE.md): Cơ sở dữ liệu SQLite trong Store DO (migrations 001 - 002), cấu trúc bàn, log lệnh và idempotency.

### 4. [`04-api/`](04-api/) - Thiết kế API & Giao thức truyền thông
- [`API_REFERENCE.md`](04-api/API_REFERENCE.md): Danh sách toàn bộ HTTP REST API endpoints (`/api/auth/*`, `/api/devices/*`, `/api/pos/*`, `/api/staff/*`, `/api/system/*`).
- [`COMMANDS_AND_RPC.md`](04-api/COMMANDS_AND_RPC.md): Cấu trúc Command Envelope, các lệnh thay đổi bàn và Store DO RPC methods.
- [`PERMISSIONS_CATALOG.md`](04-api/PERMISSIONS_CATALOG.md): Danh mục hơn 30+ quyền hạn RBAC phân theo nhóm nghiệp vụ.

### 5. [`05-huongdan/`](05-huongdan/) - Hướng dẫn Phát triển & Vận hành
- [`DEVELOPMENT_GUIDE.md`](05-huongdan/DEVELOPMENT_GUIDE.md): Hướng dẫn cài đặt, chạy local, kiểm thử CI và quản lý migrations.
- [`DESKTOP_DEPLOYMENT.md`](05-huongdan/DESKTOP_DEPLOYMENT.md): Hướng dẫn build, đóng gói installer Windows/macOS/Linux và checklist production.
- [`SECURITY_GUIDELINES.md`](05-huongdan/SECURITY_GUIDELINES.md): 15 nguyên tắc bảo mật bất biến của hệ thống.
