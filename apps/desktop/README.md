# Billiards POS Desktop Client

Ứng dụng Desktop POS viết bằng Electron + React + TypeScript dành cho hệ thống quản lý quán billiards, tối ưu hóa cho môi trường Windows.

## 1. Ranh giới bảo mật (Security Architecture)

```text
Renderer Process (React + Tailwind/CSS)
   │ window.desktopApi (Preload contextBridge)
   ▼
Preload (Narrow Typed Bridge)
   │ IPC invoke / send
   ▼
Main Process (Node.js)
   ├── HTTP Client giao tiếp với Worker qua HTTPS
   ├── Quản lý định danh thiết bị (installationId)
   ├── Mã hóa & lưu trữ thông tin đăng nhập bằng safeStorage:
   │   ├── app.getPath('userData')/device/credential.bin
   │   └── app.getPath('userData')/auth/session.bin
   ├── Native Printing (In nhiệt hóa đơn 80mm)
   └── Auto Updater
```

**Nguyên tắc bảo mật:**
- `contextIsolation: true`, `nodeIntegration: false`, renderer sandbox bật.
- Renderer **không bao giờ** nhận raw `deviceSecret` hay raw `sessionToken`.
- IPC được định kiểu chặt chẽ, kiểm tra `senderFrame` để từ chối các request không hợp lệ.
- Ứng dụng khi đóng gói (packaged) bắt buộc chỉ giao tiếp qua backend HTTPS.
- HTTP backend chỉ được cho phép đối với địa chỉ loopback (`localhost` / `127.0.0.1`) trong môi trường development.

---

## 2. Quản lý thông tin đăng nhập Local

Dữ liệu cục bộ được lưu trong thư mục `userData` của hệ điều hành:

```text
app.getPath('userData')/
├── device/
│   ├── installation.json    # UUID cố định của lần cài đặt app (không phải secret)
│   └── credential.bin       # Mã hóa deviceId + deviceSecret qua async safeStorage
└── auth/
    └── session.bin          # Mã hóa sessionToken + actor data qua async safeStorage
```

---

## 3. Các luồng giao diện chính (UI Flows)

### 3.1. DeviceGate (Kích hoạt thiết bị)
- Các trạng thái khởi động: `not_activated`, `needs_reactivation`, `ready`, `blocked`, `unavailable`, `local_error`.
- Thiết bị chưa kích hoạt sẽ yêu cầu nhập mã Token kích hoạt (One-time Activation Token).

### 3.2. AuthGate (Đăng nhập)
- **Đăng nhập Quản trị:** Nhập Tên đăng nhập / Email + Mật khẩu (dành cho Chủ quán & Quản lý).
- **Đăng nhập Nhân viên:** Chọn tên nhân viên từ danh sách và nhập mã PIN 4-6 số (có bàn phím số ảo và cơ chế đếm ngược khi bị khóa).

### 3.3. POS & Quản trị Bàn (Workspaces)
- **Dashboard / POS Workspace:** Sơ đồ bàn trực quan, trạng thái bàn trống / đang chơi, danh sách bàn.
- **Table Management Workspace:** Thêm / sửa loại bàn, thêm / sửa bàn, cấu hình thứ tự hiển thị và chuyển đổi trạng thái bàn.
- **Staff Management:** Thêm nhân viên mới, phân quyền vai trò và cấp mã PIN.

---

## 4. Preload API Bridge (`window.desktopApi`)

Preload layer cung cấp các module API an toàn cho Renderer:

- `desktopApi.device`: Kích hoạt, kiểm tra trạng thái thiết bị (`getDeviceState`, `activateDevice`, `reactivateDevice`).
- `desktopApi.auth`: Đăng nhập mật khẩu, đăng nhập mã PIN, lấy danh sách nhân viên, đăng xuất, lấy thông tin phiên làm việc hiện tại (`loginWithPassword`, `loginWithPin`, `getEmployees`, `getSession`, `logout`).
- `desktopApi.tables`: Lấy danh sách bàn, loại bàn, thực thi lệnh thay đổi bàn (`listTables`, `listTableTypes`, `executeCommand`).
- `desktopApi.staff`: Quản lý danh sách nhân sự của quán.

---

## 5. Chạy Local & Phát triển

### Yêu cầu môi trường
Tạo file `.env` từ file mẫu:

```bash
cp apps/desktop/.env.example apps/desktop/.env
```

Nội dung `.env` mặc định khi chạy dev:

```env
MAIN_VITE_API_BASE_URL=http://localhost:8787
```

### Khởi chạy ứng dụng
Từ thư mục root của dự án:

```bash
# Khởi chạy Worker trước
pnpm dev:worker

# Khởi chạy Desktop app ở terminal khác
pnpm dev:desktop
```

---

## 6. Build & Đóng gói (Packaging)

Kiểm tra kiểu dữ liệu và build ứng dụng:

```bash
pnpm typecheck:desktop
pnpm build:desktop
```

Tạo bản cài đặt cho các hệ điều hành:

```bash
# Windows
pnpm --filter @billiards/desktop build:win

# macOS
pnpm --filter @billiards/desktop build:mac

# Linux
pnpm --filter @billiards/desktop build:linux
```

---

## 7. Tài liệu liên quan

- [`../../docs/01-phantich/SYSTEM_SCOPE_V1.md`](../../docs/01-phantich/SYSTEM_SCOPE_V1.md)
- [`../../docs/02-tongquan/ARCHITECTURE.md`](../../docs/02-tongquan/ARCHITECTURE.md)
- [`../../docs/05-huongdan/DESKTOP_DEPLOYMENT.md`](../../docs/05-huongdan/DESKTOP_DEPLOYMENT.md)