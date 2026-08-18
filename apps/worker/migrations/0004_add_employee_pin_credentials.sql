-- Migration number: 0004
-- Add employee PIN credentials, PIN authentication lockout state,
-- and bind PIN credential version to authenticated sessions.
--
-- Security decisions:
-- - Never store raw employee PIN.
-- - PIN is protected with a slow password KDF in application code.
-- - Lockout state is scoped by Store + User + Device.
-- - Session actor identity is derived server-side.
-- - Existing auth_sessions continue to store only session token hashes.

-- =========================================================
-- EMPLOYEE PIN CREDENTIALS
-- =========================================================

CREATE TABLE employee_pin_credentials (
    id TEXT PRIMARY KEY,

    store_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    pin_hash TEXT NOT NULL,
    pin_salt TEXT NOT NULL,

    kdf_algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256'
        CHECK (
            kdf_algorithm IN (
                'pbkdf2-sha256'
            )
        ),

    kdf_iterations INTEGER NOT NULL
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

CREATE INDEX idx_employee_pin_credentials_store_status
    ON employee_pin_credentials (
        store_id,
        status
    );


-- =========================================================
-- EMPLOYEE PIN AUTHENTICATION STATE
--
-- This table contains authentication failure state only.
--
-- Scope:
-- Store + Employee/User + Device
--
-- It MUST NOT be trusted from request body values.
-- store_id and device_id come from authenticated DeviceContext.
-- =========================================================

CREATE TABLE employee_pin_auth_state (
    store_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,

    failed_attempts INTEGER NOT NULL DEFAULT 0
        CHECK (failed_attempts >= 0),

    failure_window_started_at TEXT,
    last_failed_at TEXT,
    locked_until TEXT,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        store_id,
        user_id,
        device_id
    ),

    FOREIGN KEY (store_id, user_id)
        REFERENCES users(store_id, id)
        ON DELETE CASCADE,

    FOREIGN KEY (store_id, device_id)
        REFERENCES devices(store_id, id)
        ON DELETE CASCADE
);

CREATE INDEX idx_employee_pin_auth_state_locked_until
    ON employee_pin_auth_state (
        locked_until
    );


-- =========================================================
-- AUTH SESSION EXTENSIONS
--
-- pin_credential_version records the PIN credential version
-- that was verified when this session was created.
--
-- It is nullable intentionally so the schema can support
-- other authentication methods in the future.
-- =========================================================

ALTER TABLE auth_sessions
ADD COLUMN pin_credential_version INTEGER
    CHECK (
        pin_credential_version IS NULL
        OR pin_credential_version >= 1
    );

ALTER TABLE auth_sessions
ADD COLUMN revocation_reason TEXT;


CREATE INDEX idx_auth_sessions_store_device_active
    ON auth_sessions (
        store_id,
        device_id,
        revoked_at,
        expires_at
    );