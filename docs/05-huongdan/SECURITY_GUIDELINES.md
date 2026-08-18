# Hướng Dẫn Bảo Mật & Ranh Giới Tin Cậy

Cập nhật: **2026-08-19**

Tài liệu này tổng hợp toàn bộ các nguyên tắc bất biến về an toàn thông tin, xác thực và phân quyền trong hệ thống Billiard Management.

---

## 1. 15 Nguyên Tắc Bất Biến (Invariant Rules)

1. **Store = Tenant Boundary:** Mỗi Store là một cửa hàng vật lý và là ranh giới cô lập dữ liệu duy nhất. Không bao giờ cho phép đọc/ghi chéo dữ liệu giữa các Store.
2. **Không Tin Cậy Dữ Liệu Định Danh Từ Client:** `storeId`, `deviceId`, `actorId` do client gửi lên không bao giờ được coi là security authority. Mọi định danh phải do server resolve và verify.
3. **Renderer Sandbox & Isolation:** Renderer Process của Electron không bao giờ nhận raw `deviceSecret` hay `sessionToken`.
4. **Mật Khẩu & Mã PIN An Toàn:** Không lưu plaintext hay fast hash (MD5, raw SHA-256). Bắt buộc dùng PBKDF2-SHA256 với salt ngẫu nhiên và tối thiểu 100,000 vòng lặp.
5. **Khóa Tài Khoản Phía Server (Lockout):** Cơ chế đếm số lần nhập sai và khóa thời gian phải nằm hoàn toàn phía Server (D1).
6. **Thu Hồi Phiên (Revocation) Nghiêm Ngặt:** Kích hoạt lại thiết bị hoặc đổi mã PIN/mật khẩu phải ngay lập tức làm mất hiệu lực toàn bộ `AuthSession` cũ.
7. **Auth Response Không Được Cache:** Mọi phản hồi liên quan đến xác thực `/api/auth/*` bắt buộc phải có header `Cache-Control: no-store`.
8. **Đồng Hồ Thời Gian Thuộc Về Server:** `issuedAt` từ client chỉ là timestamp ý định. Thời gian mở bàn, tính tiền, thanh toán và audit log bắt buộc phải lấy từ đồng hồ phía Server.
9. **Tiền Tệ Chính Xác Tuyệt Đối:** Không dùng floating-point để tính tiền. Toàn bộ tiền tệ dùng số nguyên (VND integer).
10. **Timer UI Không Phải Nguồn Sự Thật:** Giao diện hiển thị thời gian chạy chỉ là visual calculation; tiền giờ thực tế được tính toán từ `start_time` lưu trong Store DO SQLite.
11. **Snapshot Giá Bất Biến:** Giá giờ và giá mặt hàng phải được snapshot vào phiên chơi / hóa đơn. Thay đổi bảng giá sau này không làm thay đổi lịch sử.
12. **Command Idempotency:** Mọi thay đổi nghiệp vụ quan trọng phải có `commandId` và cơ chế chống thực thi trùng lặp (deduplication/fingerprint).
13. **Fail-Closed Permissions:** Mọi request thiếu quyền hạn đều bị từ chối với mã lỗi `403 Forbidden`. Không có ngoại lệ.
14. **One Installation One Store:** Một `installationId` của app Desktop chỉ thuộc tối đa một Store tại một thời điểm (ADR-003).
15. **System Diagnostics Tách Biệt:** Các endpoint chẩn đoán `/api/system/*` yêu cầu Bearer token riêng biệt; nếu token cấu hình chưa đủ mạnh, endpoint trả về `404 Not Found` fail-closed.
