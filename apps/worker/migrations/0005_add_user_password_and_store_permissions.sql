-- Migration number: 0005
-- Add user password credentials and expand permission catalog for complete store management.

-- =========================================================
-- USER PASSWORD CREDENTIALS
-- =========================================================

CREATE TABLE IF NOT EXISTS user_password_credentials (
    id TEXT PRIMARY KEY,

    store_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,

    kdf_algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256'
        CHECK (
            kdf_algorithm IN (
                'pbkdf2-sha256'
            )
        ),

    kdf_iterations INTEGER NOT NULL DEFAULT 100000
        CHECK (kdf_iterations >= 1),

    credential_version INTEGER NOT NULL DEFAULT 1
        CHECK (credential_version >= 1),

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'revoked'
            )
        ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    rotated_at TEXT,
    revoked_at TEXT,

    FOREIGN KEY (store_id, user_id)
        REFERENCES users(store_id, id)
        ON DELETE RESTRICT,

    UNIQUE (store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_password_credentials_store_status
    ON user_password_credentials (
        store_id,
        status
    );

-- =========================================================
-- EXPAND PERMISSION CATALOG
-- =========================================================

INSERT OR IGNORE INTO permission_catalog (permission_key, group_key, display_name, description, sort_order) VALUES
-- Tables & POS
('table.view', 'tables', 'Xem trạng thái bàn', 'Xem sơ đồ và trạng thái hiện tại của bàn', 10),
('table.open', 'tables', 'Mở bàn tính giờ', 'Mở bàn cho khách và bắt đầu tính tiền giờ', 20),
('table.transfer', 'tables', 'Chuyển bàn / gộp bàn', 'Chuyển đổi hoặc gộp phiên chơi giữa các bàn', 30),
('table.manage', 'tables', 'Quản lý cấu hình bàn', 'Thêm, sửa, xóa bàn và loại bàn trong quán', 40),
('table.order', 'tables', 'Gọi món / dịch vụ tại bàn', 'Thêm món ăn đồ uống vào bàn đang chơi', 50),
('session.adjust_time', 'tables', 'Điều chỉnh giờ chơi', 'Chỉnh sửa giờ bắt đầu hoặc thời gian phiên chơi', 60),

-- Invoices
('invoices.view', 'invoices', 'Xem hóa đơn', 'Xem danh sách và chi tiết các hóa đơn bán hàng', 100),
('invoices.print', 'invoices', 'In biên lai', 'In phiếu tạm tính hoặc hóa đơn thanh toán', 110),
('invoices.export', 'invoices', 'Xuất danh sách hóa đơn', 'Xuất dữ liệu hóa đơn ra file Excel / CSV', 120),
('invoices.cancel', 'invoices', 'Hủy hóa đơn', 'Hủy hóa đơn chưa thanh toán hoặc hóa đơn lỗi (yêu cầu mã PIN)', 130),
('invoices.delete', 'invoices', 'Xóa hóa đơn', 'Xóa vĩnh viễn hóa đơn khỏi hệ thống', 140),

-- Products
('products.view', 'products', 'Xem danh sách mặt hàng', 'Xem thông tin menu, giá bán các sản phẩm dịch vụ', 200),
('products.create', 'products', 'Tạo mặt hàng mới', 'Thêm mới mặt hàng vào thực đơn của quán', 210),
('products.edit', 'products', 'Chỉnh sửa mặt hàng', 'Cập nhật giá bán, tên, đơn vị tính của mặt hàng', 220),
('products.delete', 'products', 'Xóa mặt hàng', 'Xóa sản phẩm khỏi danh sách phục vụ', 230),
('products.import_export', 'products', 'Nhập / Xuất mặt hàng', 'Import hoặc Export danh sách mặt hàng qua Excel', 240),

-- Menus
('menus.view', 'menus', 'Xem danh sách thực đơn', 'Xem các loại thực đơn (Đồ ăn, Đồ uống, Cafe, Ăn tại bàn, Mang đi)', 300),
('menus.create', 'menus', 'Tạo mới thực đơn', 'Tạo loại thực đơn mới', 310),
('menus.edit', 'menus', 'Chỉnh sửa thực đơn', 'Cập nhật tên, mô tả loại thực đơn', 320),
('menus.delete', 'menus', 'Xóa thực đơn', 'Xóa loại thực đơn', 330),

-- Categories
('categories.view', 'categories', 'Xem danh mục phân loại', 'Xem danh mục hàng hóa (Thịt, Rau củ, Nước lon, Snack)', 400),
('categories.create', 'categories', 'Tạo mới danh mục', 'Tạo danh mục phân loại sản phẩm', 410),
('categories.edit', 'categories', 'Chỉnh sửa danh mục', 'Đổi tên và thuộc tính danh mục', 420),
('categories.delete', 'categories', 'Xóa danh mục', 'Xóa danh mục phân loại', 430),

-- Customers & Debt
('customers.view', 'customers', 'Xem danh sách khách hàng', 'Xem thông tin khách hàng và lịch sử chơi', 500),
('customers.create', 'customers', 'Thêm khách hàng', 'Tạo mới hồ sơ khách hàng', 510),
('customers.edit_debt', 'customers', 'Sửa & Thu nợ khách hàng', 'Ghi nhận trả nợ, thu nợ, chỉnh sửa công nợ', 520),
('customers.delete', 'customers', 'Xóa khách hàng', 'Xóa thông tin khách hàng', 530),
('customers.import_export', 'customers', 'Nhập / Xuất khách hàng', 'Import / Export danh sách khách qua Excel', 540),
('customers.groups.view', 'customers', 'Xem nhóm khách hàng', 'Xem danh sách các nhóm khách (VIP, Thân thiết)', 550),
('customers.groups.manage', 'customers', 'Quản lý nhóm khách hàng', 'Tạo, sửa, xóa các nhóm khách hàng', 560),

-- Staff & Store Management
('staff.manage', 'store', 'Quản lý nhân viên', 'Tạo tài khoản nhân viên, phân quyền, cấp mã PIN', 600),
('role.manage', 'store', 'Quản lý vai trò', 'Tạo và thiết lập quyền hạn các vai trò', 610),
('report.view', 'store', 'Xem báo cáo doanh thu', 'Xem thống kê doanh thu theo ngày, tháng, ca', 620),
('store.settings.manage', 'store', 'Cài đặt cửa hàng', 'Cấu hình thông tin quán, máy in, bảng giá giờ', 630);
