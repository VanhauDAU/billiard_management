# Hướng Dẫn Đóng Gói & Triển Khai Desktop POS

Cập nhật: **2026-08-19**

Tài liệu này hướng dẫn cách đóng gói ứng dụng Electron Desktop POS cho các hệ điều hành và các yêu cầu bảo mật môi trường Production.

---

## 1. Yêu cầu Môi trường Production

1. **HTTPS Bắt buộc:** Ứng dụng Desktop khi đóng gói (Packaged) **bắt buộc** phải kết nối với backend thông qua giao thức HTTPS. Mọi kết nối HTTP không bảo mật sẽ bị chặn đứng (fail-closed) bởi Main Process.
2. **App ID & Identity:**
   - App ID: `com.billiards.pos`
   - Product Name: `Billiards POS`
   - Windows Executable: `billiards-pos.exe`
3. **Mã hóa Credential:** Main process tự động sử dụng `safeStorage` của Electron (sử dụng DPAPI trên Windows, Keychain trên macOS, Secret Service trên Linux) để mã hóa Device Secret và Session Token.

---

## 2. Các lệnh Đóng gói (Build & Package Scripts)

### 2.1. Đóng gói cho Windows
```bash
pnpm --filter @billiards/desktop build:win
```
- Kết quả xuất ra file installer `.exe` trong thư mục `apps/desktop/dist`.

### 2.2. Đóng gói cho macOS
```bash
pnpm --filter @billiards/desktop build:mac
```
- Kết quả xuất ra file `.dmg` hoặc `.app` trong `apps/desktop/dist`.

### 2.3. Đóng gói cho Linux
```bash
pnpm --filter @billiards/desktop build:linux
```
- Kết quả xuất ra file `.AppImage` hoặc `.deb` trong `apps/desktop/dist`.

### 2.4. Unpack Build (Dành cho kiểm tra file nội bộ)
```bash
pnpm --filter @billiards/desktop build:unpack
```

---

## 3. Checklist Trước Khi Triển Khai Thử Nghiệm (Pilot)

- [ ] Cấu hình URL Backend Production (HTTPS) vào cấu hình đóng gói.
- [ ] Ký số mã nguồn (Code Signing Certificate) cho Windows để tránh cảnh báo Windows SmartScreen.
- [ ] Kiểm tra tính năng Auto Update không làm mất dữ liệu định danh (`installation.json`) và session trong `userData`.
- [ ] Thử nghiệm in bill 80mm trên máy in nhiệt thực tế.
