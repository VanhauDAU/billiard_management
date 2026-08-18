# Tài Liệu Thiết Kế: Quản Lý Khu Vực & Bàn/Phòng (Zone & Table Management V1)

## 1. Mục Tiêu Nghiệp Vụ
Phân hệ **Thiết lập khu vực & Bàn** được đặt trong mục **Thiết lập (Settings)** của Quản trị viên (Admin/Owner), cho phép:
1. **Thiết lập danh sách khu vực**: Tạo mới, đổi tên, xóa khu vực và **sắp xếp thứ tự hiển thị của các khu vực**.
2. **Tạo khu vực mới**: Bắt buộc phải có ít nhất 1 bàn/phòng mới cho phép Lưu (`Validation Rule`).
3. **Thêm bàn/phòng tinh gọn**: Chỉ nhập tên bàn (vd: `001`, `Bàn 01`, `VIP 01`) và loại bàn (`Bàn Lỗ`, `Carom 3C`, `Bàn Líp`), lược bỏ hoàn toàn các trường giá bàn không cần thiết.
4. **Sắp xếp thứ tự bàn trong khu vực**: Khi mở chi tiết khu vực, Admin có thể thay đổi thứ tự render của các bàn. Thứ tự này đồng bộ trực tiếp với màn hình Bán hàng (Staff POS).

---

## 2. Luồng Trải Nghiệm Người Dùng (UX Flow)

```
[Thiết lập (Settings Hub)]
      │
      └──► [Thiết lập khu vực & Bàn] (Màn hình 1)
                │
                ├──► [⊕ Thêm khu vực] (Màn hình 2)
                │         ├──► Chưa có bàn: Nút "Lưu" disabled
                │         └──► [Thêm bàn/ phòng mới] (Popup Modal 3)
                │                   └──► Nhập Tên bàn -> Lưu -> Bật nút Lưu khu vực
                │
                └──► [Bấm vào Khu vực chi tiết]
                          └──► Sắp xếp thứ tự hiển thị bàn (▲ / ▼ / Drag)
                          └──► Thêm/Xóa bàn
                          └──► [Lưu thứ tự & Cập nhật]
```

---

## 3. Cấu Trúc Dữ Liệu (Schema)

```typescript
export interface TableConfig {
  id: string;          // ID duy nhất của bàn
  name: string;        // Tên hiển thị của bàn (vd: "001", "Bàn 1")
  type: 'pool' | 'carom' | 'libre'; // Loại bàn bida
  status?: 'available' | 'occupied' | 'reserved';
}

export interface ZoneConfig {
  id: string;          // ID khu vực
  name: string;        // Tên khu vực (vd: "Khu vực 1", "Tầng 2 - VIP")
  order: number;       // Thứ tự sắp xếp hiển thị
  tables: TableConfig[]; // Danh sách bàn theo thứ tự
}
```

---

## 4. Tương Thích & Đồng Bộ
- Dữ liệu cấu hình khu vực và bàn được lưu vào bộ nhớ cục bộ `billiard_zones_tables_v1`.
- Giao diện POS của nhân viên (`PosZoneTablesScreen`) tự động đọc danh sách khu vực và hiển thị các thẻ bàn theo đúng thứ tự admin đã sắp xếp.
