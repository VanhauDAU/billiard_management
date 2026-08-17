-- Migration number: 0001
-- Initial Store-based control-plane schema.
--
-- V1 decision:
-- - One Store = one physical billiards shop.
-- - No branch/branch_id model.
-- - Operational billiards data will live in Store Durable Object SQLite.
-- - D1 stores control/auth/device/permission metadata.

-- =========================================================
-- STORES
-- =========================================================

CREATE TABLE stores (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'suspended',
                'closed'
            )
        ),

    address_text TEXT,
    phone TEXT,

    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    locale TEXT NOT NULL DEFAULT 'vi-VN',
    currency TEXT NOT NULL DEFAULT 'VND',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (slug)
);

CREATE INDEX idx_stores_status
    ON stores (status);


-- =========================================================
-- USERS
--
-- V1:
-- User belongs to exactly one Store.
-- Future multi-store owner identity will be a separate design.
-- =========================================================

CREATE TABLE users (
    id TEXT PRIMARY KEY,

    store_id TEXT NOT NULL,

    username TEXT NOT NULL,
    username_normalized TEXT NOT NULL,

    display_name TEXT NOT NULL,

    email TEXT,
    phone TEXT,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'disabled'
            )
        ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT,

    UNIQUE (store_id, id),
    UNIQUE (store_id, username_normalized)
);

CREATE INDEX idx_users_store_status
    ON users (store_id, status);


-- =========================================================
-- ROLES
--
-- Default examples:
-- owner / manager / cashier / staff
--
-- Custom roles are allowed.
-- Owner role is protected by application/domain rules.
-- =========================================================

CREATE TABLE roles (
    id TEXT PRIMARY KEY,

    store_id TEXT NOT NULL,

    code TEXT NOT NULL,
    name TEXT NOT NULL,

    is_system INTEGER NOT NULL DEFAULT 0
        CHECK (is_system IN (0, 1)),

    is_protected INTEGER NOT NULL DEFAULT 0
        CHECK (is_protected IN (0, 1)),

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'disabled'
            )
        ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT,

    UNIQUE (store_id, id),
    UNIQUE (store_id, code)
);

CREATE INDEX idx_roles_store_status
    ON roles (store_id, status);


-- =========================================================
-- PERMISSION CATALOG
--
-- System-controlled capability allowlist.
-- Store owners may assign these permissions to roles,
-- but may not invent arbitrary security capability keys.
-- =========================================================

CREATE TABLE permission_catalog (
    permission_key TEXT PRIMARY KEY,

    group_key TEXT NOT NULL,
    display_name TEXT NOT NULL,

    description TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- ROLE PERMISSIONS
--
-- Absence of a permission row means "not granted".
-- =========================================================

CREATE TABLE role_permissions (
    store_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    permission_key TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        role_id,
        permission_key
    ),

    FOREIGN KEY (store_id, role_id)
        REFERENCES roles(store_id, id)
        ON DELETE CASCADE,

    FOREIGN KEY (permission_key)
        REFERENCES permission_catalog(permission_key)
        ON DELETE RESTRICT
);

CREATE INDEX idx_role_permissions_store_role
    ON role_permissions (store_id, role_id);


-- =========================================================
-- STORE MEMBERSHIPS
--
-- One employee/user has one role in V1.
-- If more complex permission composition is needed later,
-- custom roles should be preferred over multiple role assignment.
-- =========================================================

CREATE TABLE store_memberships (
    id TEXT PRIMARY KEY,

    store_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'pending',
                'active',
                'suspended',
                'revoked'
            )
        ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id, user_id)
        REFERENCES users(store_id, id)
        ON DELETE RESTRICT,

    FOREIGN KEY (store_id, role_id)
        REFERENCES roles(store_id, id)
        ON DELETE RESTRICT,

    UNIQUE (store_id, id),
    UNIQUE (store_id, user_id),

    -- Used by auth_sessions to guarantee that the membership
    -- belongs to the exact Store + User pair.
    UNIQUE (
        store_id,
        id,
        user_id
    )
);

CREATE INDEX idx_store_memberships_store_status
    ON store_memberships (store_id, status);

CREATE INDEX idx_store_memberships_user_status
    ON store_memberships (user_id, status);

CREATE INDEX idx_store_memberships_role
    ON store_memberships (store_id, role_id);


-- =========================================================
-- DEVICES
--
-- Represents a registered Desktop POS or Mobile PWA device.
-- =========================================================

CREATE TABLE devices (
    id TEXT PRIMARY KEY,

    store_id TEXT NOT NULL,

    installation_id TEXT NOT NULL,

    name TEXT NOT NULL,

    device_type TEXT NOT NULL
        CHECK (
            device_type IN (
                'desktop_pos',
                'mobile_pwa'
            )
        ),

    platform TEXT NOT NULL
        CHECK (
            platform IN (
                'windows',
                'macos',
                'ios',
                'android',
                'web'
            )
        ),

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'pending',
                'active',
                'revoked'
            )
        ),

    app_version TEXT,

    registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT,
    revoked_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT,

    UNIQUE (store_id, id),
    UNIQUE (store_id, installation_id)
);

CREATE INDEX idx_devices_store_status
    ON devices (store_id, status);

CREATE INDEX idx_devices_store_last_seen
    ON devices (store_id, last_seen_at);


-- =========================================================
-- AUTH SESSIONS
--
-- Never store raw session tokens.
-- Only session_token_hash is persisted.
--
-- PIN credentials are intentionally NOT part of migration 0001.
-- PIN + AuthGate + rate limiting + lockout will be designed later.
-- =========================================================

CREATE TABLE auth_sessions (
    id TEXT PRIMARY KEY,

    store_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    membership_id TEXT NOT NULL,
    device_id TEXT NOT NULL,

    session_token_hash TEXT NOT NULL,

    expires_at TEXT NOT NULL,

    last_seen_at TEXT,
    revoked_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id, user_id)
        REFERENCES users(store_id, id)
        ON DELETE RESTRICT,

    FOREIGN KEY (
        store_id,
        membership_id,
        user_id
    )
        REFERENCES store_memberships(
            store_id,
            id,
            user_id
        )
        ON DELETE RESTRICT,

    FOREIGN KEY (store_id, device_id)
        REFERENCES devices(store_id, id)
        ON DELETE RESTRICT,

    UNIQUE (session_token_hash)
);

CREATE INDEX idx_auth_sessions_store_user
    ON auth_sessions (store_id, user_id);

CREATE INDEX idx_auth_sessions_store_device
    ON auth_sessions (store_id, device_id);

CREATE INDEX idx_auth_sessions_expiry
    ON auth_sessions (expires_at);


-- =========================================================
-- STORE REGISTRY
--
-- Maps Store to its operational Durable Object identity.
--
-- In V1 durable_object_key will normally be derived from store_id,
-- but registry keeps provisioning/schema metadata in the control plane.
-- =========================================================

CREATE TABLE store_registry (
    store_id TEXT PRIMARY KEY,

    durable_object_key TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'provisioning'
        CHECK (
            status IN (
                'provisioning',
                'active',
                'suspended',
                'error'
            )
        ),

    schema_version INTEGER NOT NULL DEFAULT 1
        CHECK (schema_version >= 1),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT,

    UNIQUE (durable_object_key)
);

CREATE INDEX idx_store_registry_status
    ON store_registry (status);


-- =========================================================
-- INITIAL PERMISSION CATALOG
-- =========================================================

INSERT INTO permission_catalog (
    permission_key,
    group_key,
    display_name,
    sort_order
)
VALUES
    ('table.view',            'table',    'Xem bàn',                         10),
    ('table.open',            'table',    'Mở bàn',                          20),
    ('table.transfer',        'table',    'Chuyển bàn',                      30),
    ('table.manage',          'table',    'Quản lý bàn và loại bàn',         40),

    ('session.adjust_time',   'session',  'Điều chỉnh thời gian chơi',       50),

    ('product.view',          'product',  'Xem sản phẩm',                    60),
    ('product.add_to_bill',   'product',  'Thêm sản phẩm vào bàn',           70),
    ('product.remove_item',   'product',  'Xóa sản phẩm khỏi hóa đơn',       80),
    ('product.manage',        'product',  'Quản lý sản phẩm và danh mục',     90),

    ('pricing.manage',        'pricing',  'Quản lý cấu hình giá bàn',        100),

    ('bill.view',             'bill',     'Xem hóa đơn',                     110),
    ('bill.merge',            'bill',     'Gộp hóa đơn',                     120),
    ('bill.pay',              'bill',     'Thanh toán hóa đơn',              130),

    ('employee.manage',       'employee', 'Quản lý nhân viên',               140),
    ('role.manage',           'employee', 'Quản lý vai trò và phân quyền',   150),

    ('report.view',           'report',   'Xem báo cáo',                     160),

    ('print.template.manage', 'print',    'Quản lý mẫu in',                  170),

    ('store.settings.manage', 'store',    'Quản lý cấu hình cửa hàng',       180);


PRAGMA optimize;