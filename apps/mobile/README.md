# Billiards Mobile PWA

React + TypeScript + Vite scaffold cho Mobile PWA của hệ thống quản lý billiards.

## Trạng thái

**Deferred scaffold.** Mobile chưa phải operational client ở M1 hiện tại.

Thứ tự triển khai đã chốt:

```text
Desktop online vertical slice
      ↓
Device / Employee / Permission
      ↓
Tables / Session / Product / Bill / Payment
      ↓
Mobile PWA + realtime
```

Không triển khai business rule riêng cho Mobile trước khi contracts/commands phía server ổn định.

## Kiến trúc mục tiêu

Mobile sau này là full operational client theo permission, không chỉ viewer:

- xem trạng thái bàn,
- mở bàn,
- thêm sản phẩm,
- chuyển bàn,
- gộp bill,
- thanh toán,
- xem hóa đơn,
- xem báo cáo/quản lý theo permission.

Mobile phải dùng chung:

- Worker APIs,
- trusted Store/Auth/Permission boundary,
- `@billiards/contracts`,
- command semantics,
- server-side business validation.

Không fork pricing/table/session/bill/payment logic riêng vào PWA.

## Chưa triển khai

Hiện chưa có:

- Mobile device activation/authentication hoàn chỉnh,
- Employee PIN AuthGate,
- permission context,
- realtime Store DO connection,
- PWA install/offline strategy,
- operational screens.

Các mục trên sẽ được thêm theo milestone, không coi scaffold hiện tại là feature hoàn chỉnh.

## Development

Trong thư mục `apps/mobile`:

```bash
pnpm dev
```

Các script cụ thể xem tại `package.json`.

## Tài liệu liên quan

- `../../docs/ARCHITECTURE.md`
- `../../docs/PROGRESS.md`
- `../../docs/SYSTEM_SCOPE_V1.md`

Khi bắt đầu milestone Mobile, cập nhật README này cùng contracts và security boundary trước khi thêm UI nghiệp vụ lớn.