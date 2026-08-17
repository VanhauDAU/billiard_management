-- Migration number: 0001
-- Initial control-plane schema.
--
-- D1 stores tenant/account/device/auth metadata only.
-- Operational billiards data (tables, bills, sessions, payments, products...)
-- will live in the Branch Durable Object, not here.

-- =========================================================
-- TENANTS
-- =========================================================

CREATE TABLE tenants (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'closed')),

    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    locale TEXT NOT NULL DEFAULT 'vi-VN',
    currency TEXT NOT NULL DEFAULT 'VND',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (slug)
);

-- =========================================================
-- BRANCHES
-- =========================================================

CREATE TABLE branches (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,

    code TEXT NOT NULL,
    name TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'closed')),

    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',

    address_text TEXT,
    phone TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_branches_tenant_status
    ON branches (tenant_id, status);

-- =========================================================
-- USERS
-- User is tenant-scoped in V1.
-- The same real person in another tenant receives another user row.
-- =========================================================

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,

    username TEXT NOT NULL,
    username_normalized TEXT NOT NULL,

    display_name TEXT NOT NULL,

    email TEXT,
    phone TEXT,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, username_normalized)
);

CREATE INDEX idx_users_tenant_status
    ON users (tenant_id, status);

-- =========================================================
-- MEMBERSHIPS
-- Defines what a user may do at a branch.
--
-- We intentionally make branch_id NOT NULL.
-- A user that works at multiple branches gets one membership per branch.
-- =========================================================

CREATE TABLE memberships (
    id TEXT PRIMARY KEY,

    tenant_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    role TEXT NOT NULL
        CHECK (
            role IN (
                'owner',
                'admin',
                'manager',
                'cashier',
                'staff'
            )
        ),

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

    FOREIGN KEY (tenant_id, branch_id)
        REFERENCES branches(tenant_id, id)
        ON DELETE RESTRICT,

    FOREIGN KEY (tenant_id, user_id)
        REFERENCES users(tenant_id, id)
        ON DELETE RESTRICT,

    UNIQUE (tenant_id, id),
    UNIQUE (branch_id, user_id)
);

CREATE INDEX idx_memberships_branch_status
    ON memberships (branch_id, status);

CREATE INDEX idx_memberships_user_status
    ON memberships (user_id, status);

CREATE INDEX idx_memberships_tenant_role
    ON memberships (tenant_id, role);

-- =========================================================
-- DEVICES
-- Represents one installed client/device.
--
-- installation_id will later be generated once and persisted locally
-- by the client installation.
-- =========================================================

CREATE TABLE devices (
    id TEXT PRIMARY KEY,

    tenant_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,

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

    FOREIGN KEY (tenant_id, branch_id)
        REFERENCES branches(tenant_id, id)
        ON DELETE RESTRICT,

    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, installation_id)
);

CREATE INDEX idx_devices_branch_status
    ON devices (branch_id, status);

CREATE INDEX idx_devices_tenant_last_seen
    ON devices (tenant_id, last_seen_at);

-- =========================================================
-- AUTH SESSIONS
--
-- Never store a raw session token.
-- session_token_hash contains only the hash used for lookup/validation.
--
-- PIN credential storage is intentionally NOT added in this migration.
-- It will be designed together with AuthGate/rate limiting.
-- =========================================================

CREATE TABLE auth_sessions (
    id TEXT PRIMARY KEY,

    tenant_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    membership_id TEXT NOT NULL,
    device_id TEXT NOT NULL,

    session_token_hash TEXT NOT NULL,

    expires_at TEXT NOT NULL,

    last_seen_at TEXT,
    revoked_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id, branch_id)
        REFERENCES branches(tenant_id, id)
        ON DELETE RESTRICT,

    FOREIGN KEY (tenant_id, user_id)
        REFERENCES users(tenant_id, id)
        ON DELETE RESTRICT,

    FOREIGN KEY (tenant_id, membership_id)
        REFERENCES memberships(tenant_id, id)
        ON DELETE RESTRICT,

    FOREIGN KEY (tenant_id, device_id)
        REFERENCES devices(tenant_id, id)
        ON DELETE RESTRICT,

    UNIQUE (session_token_hash)
);

CREATE INDEX idx_auth_sessions_user
    ON auth_sessions (tenant_id, user_id);

CREATE INDEX idx_auth_sessions_device
    ON auth_sessions (tenant_id, device_id);

CREATE INDEX idx_auth_sessions_expiry
    ON auth_sessions (expires_at);

-- =========================================================
-- BRANCH REGISTRY
--
-- Maps a branch to its operational data-plane identity.
-- durable_object_key will later be used to derive/locate the Branch DO.
-- =========================================================

CREATE TABLE branch_registry (
    branch_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,

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

    FOREIGN KEY (tenant_id, branch_id)
        REFERENCES branches(tenant_id, id)
        ON DELETE RESTRICT,

    UNIQUE (durable_object_key)
);

CREATE INDEX idx_branch_registry_tenant
    ON branch_registry (tenant_id);

-- Let SQLite/D1 refresh planner statistics when appropriate.
PRAGMA optimize;
