# Hướng Dẫn Phát Triển (Development Guide)

Cập nhật: **2026-08-19**

Tài liệu này hướng dẫn cài đặt môi trường, chạy local, kiểm thử và thực thi các lệnh thường dùng trong dự án.

---

## 1. Yêu cầu hệ thống

- **Node.js:** v20 trở lên.
- **pnpm:** v9 trở lên (`npm install -g pnpm`).
- **Wrangler:** Quản lý Cloudflare Worker & D1 (đã có sẵn trong devDependencies).

---

## 2. Cài đặt ban đầu (Setup)

1. **Clone repository và cài đặt dependencies:**
   ```bash
   git clone https://github.com/VanhauDAU/billiard_management.git
   cd billiard_management
   pnpm install
   ```

2. **Cấu hình biến môi trường:**
   - **Worker:** Tạo `.dev.vars` nếu cần dùng system diagnostics:
     ```bash
     cp apps/worker/.dev.vars.example apps/worker/.dev.vars
     ```
   - **Desktop:** Tạo `.env`:
     ```bash
     cp apps/desktop/.env.example apps/desktop/.env
     ```

3. **Áp dụng D1 Migrations Local:**
   ```bash
   pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
   ```

---

## 3. Khởi chạy Local (Running Locally)

### Chạy Worker API (Terminal 1):
```bash
pnpm dev:worker
```
- Worker sẽ lắng nghe tại: `http://localhost:8787`
- Kiểm tra sức khỏe Worker:
  ```bash
  curl http://localhost:8787/api/health
  ```

### Chạy Desktop POS Client (Terminal 2):
```bash
pnpm dev:desktop
```
Ứng dụng Electron sẽ tự động khởi động và kết nối với Worker API local.

---

## 4. Chạy Kiểm Thử & CI Quality Gate

### Chạy toàn bộ CI pipeline:
```bash
pnpm run ci
```

### Chạy riêng lẻ từng module:
- **Typecheck Contracts:**
  ```bash
  pnpm typecheck:contracts
  ```
- **Typecheck Worker:**
  ```bash
  pnpm typecheck:worker
  ```
- **Chạy Unit/Integration Tests của Worker (Vitest):**
  ```bash
  pnpm test:worker
  ```
- **Typecheck & Build Desktop:**
  ```bash
  pnpm build:desktop
  ```

---

## 5. D1 Control Plane Migrations

### Tạo migration mới:
```bash
pnpm --dir apps/worker exec wrangler d1 migrations create billiards-control-plane <ten_migration>
```

### Áp dụng migration local:
```bash
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
```

### Kiểm tra foreign keys:
```bash
pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --command "PRAGMA foreign_key_check;"
```

### Reset dữ liệu D1 local:
```bash
rm -rf apps/worker/.wrangler/state
pnpm --dir apps/worker exec wrangler d1 migrations apply billiards-control-plane --local
```
