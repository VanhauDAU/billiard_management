# Billiards Mobile PWA

React + TypeScript + Vite scaffold cho Mobile PWA của hệ thống quản lý quán billiards.

## 1. Trạng thái hiện tại

**Deferred scaffold.** Mobile chưa phải operational client ở M1 hiện tại.

Thứ tự triển khai đã chốt trong Roadmap:

```text
Desktop online vertical slice (M1)
       ↓
Device / Employee / Permission
       ↓
Tables / Session / Product / Bill / Payment
       ↓
Mobile PWA + Realtime State Sync (M4)
```

Không triển khai business rule riêng cho Mobile trước khi contracts/commands phía server hoàn toàn ổn định.

---

## 2. Kiến trúc mục tiêu (M4)

Mobile PWA sau này là full operational client theo quyền hạn được cấp (`PermissionContext`):

- Xem trạng thái và sơ đồ bàn realtime.
- Mở bàn tính giờ cho khách.
- Gọi món / thêm sản phẩm tại bàn.
- Chuyển bàn, gộp bill.
- Xem hóa đơn và thanh toán.
- Xem báo cáo doanh thu theo quyền.

### Ranh giới kiến trúc:
Mobile bắt buộc phải dùng chung:
- Cloudflare Worker APIs qua HTTPS.
- Trusted Store / Auth / Permission boundaries.
- Package `@billiards/contracts`.
- Command semantics & idempotency.
- Server-side business validation (không fork logic tính tiền ra client).

---

## 3. Khởi chạy Local

Trong thư mục `apps/mobile`:

```bash
pnpm dev
```

---

## 4. Tài liệu liên quan

- [`../../docs/01-phantich/SYSTEM_SCOPE_V1.md`](../../docs/01-phantich/SYSTEM_SCOPE_V1.md)
- [`../../docs/02-tongquan/ARCHITECTURE.md`](../../docs/02-tongquan/ARCHITECTURE.md)
- [`../../docs/02-tongquan/ROADMAP.md`](../../docs/02-tongquan/ROADMAP.md)
- [`../../docs/02-tongquan/PROGRESS.md`](../../docs/02-tongquan/PROGRESS.md)