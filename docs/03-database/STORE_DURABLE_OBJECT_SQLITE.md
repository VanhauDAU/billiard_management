# Store Durable Object SQLite Database

Cập nhật: **2026-08-19**

Mỗi cửa hàng (`Store`) sở hữu một instance **Cloudflare Durable Object** riêng biệt (`StoreDurableObject`). Durable Object này chứa một cơ sở dữ liệu SQLite nhúng trực tiếp, phục vụ các thao tác vận hành nghiệp vụ với độ trễ thấp và tính nhất quán dữ liệu cao (Strong Consistency).

---

## 1. Ranh giới vận hành (Operational Boundary)

- **Routing:** Khởi tạo hoặc truy xuất Durable Object theo định danh Store:
  ```ts
  const id = env.STORE_DO.idFromName(storeId);
  const stub = env.STORE_DO.get(id);
  ```
- **Single-Writer:** Mỗi Store chỉ có một Durable Object active tại một thời điểm, loại bỏ nguy cơ race-condition hay xung đột ghi dữ liệu.
- **Identity Lock:** Trong `migration-001-foundation.ts`, Durable Object lưu trữ `store_id` vào bảng cấu hình hệ thống. Mọi truy cập cố tình đổi `store_id` trên cùng một DO instance sẽ bị ném lỗi `store_identity_mismatch` ngay lập tức.

---

## 2. Danh sách Migrations trong Store DO

Durable Object tự quản lý migrations thông qua `StoreSchemaMigrationRunner` với `transactionSync`.

### Migration 001 - Foundation (`migration-001-foundation.ts`)
- **`system_config`**: Lưu trữ `key` / `value` cấu hình nội bộ (ví dụ: `store_id`, `created_at`).
- **`schema_migrations`**: Nhật ký các migration đã áp dụng (`version`, `name`, `applied_at`).

### Migration 002 - Table Foundation (`migration-002-table-foundation.ts`)
- **`table_types`**:
  - `id` (TEXT PRIMARY KEY - UUID)
  - `store_id` (TEXT NOT NULL)
  - `name` (TEXT NOT NULL)
  - `description` (TEXT)
  - `sort_order` (INTEGER NOT NULL DEFAULT 0)
  - `status` (TEXT NOT NULL DEFAULT 'active' CHECK status IN ('active', 'disabled'))
  - `created_at`, `updated_at` (TEXT)
- **`billiard_tables`**:
  - `id` (TEXT PRIMARY KEY - UUID)
  - `store_id` (TEXT NOT NULL)
  - `table_type_id` (TEXT NOT NULL REFERENCES table_types(id))
  - `table_number` (INTEGER NOT NULL)
  - `name` (TEXT NOT NULL)
  - `sort_order` (INTEGER NOT NULL DEFAULT 0)
  - `status` (TEXT NOT NULL DEFAULT 'available' CHECK status IN ('available', 'playing', 'disabled'))
  - `created_at`, `updated_at` (TEXT)
- **`table_commands`**:
  - `command_id` (TEXT PRIMARY KEY)
  - `store_id` (TEXT NOT NULL)
  - `command_type` (TEXT NOT NULL)
  - `fingerprint` (TEXT NOT NULL)
  - `executed_at` (TEXT NOT NULL)
  - `actor_id` (TEXT)
  - `device_id` (TEXT)
  - `result_json` (TEXT NOT NULL)

---

## 3. Các bảng kế hoạch bổ sung (Planned Schema)

### M1.5 - Pricing & Session
- **`pricing_configs`**: Bảng giá cơ bản theo loại bàn, khung giờ cao điểm, ngày trong tuần.
- **`table_sessions`**: Quản lý phiên chơi của bàn (`id`, `table_id`, `start_time`, `end_time`, `pricing_snapshot`, `status`, `actor_id`).

### M1.6 - Products & Bills
- **`categories`**: Danh mục nhóm hàng (Đồ uống, Thức ăn, Thuốc lá,...).
- **`products`**: Danh sách mặt hàng và đơn giá bán.
- **`bills`**: Hóa đơn thanh toán liên kết với `table_session`.
- **`bill_items`**: Chi tiết các món gọi tại bàn với giá snapshot tại thời điểm gọi.
- **`payments`**: Nhật ký thanh toán (Tiền mặt / Chuyển khoản).

---

## 4. Cơ chế Command Idempotency & Fingerprint

Khi thực thi lệnh thay đổi bàn qua `executeTableCommand`:
1. Tính chuỗi SHA-256 fingerprint từ nội dung command payload.
2. Truy vấn bảng `table_commands` theo `command_id`:
   - Nếu tồn tại và fingerprint khớp: Trả về `result_json` đã lưu từ trước (không chạy lại).
   - Nếu tồn tại nhưng fingerprint khác: Ném lỗi `command_id_conflict` (fail-closed).
3. Nếu chưa tồn tại: Thực thi câu lệnh SQL nghiệp vụ trong transaction và ghi nhận vào `table_commands`.
