-- Migration number: 0002
-- Add device credentials and one-time activation tokens.

-- =========================================================
-- DEVICE CREDENTIALS
-- =========================================================

ALTER TABLE devices
ADD COLUMN credential_hash TEXT;

ALTER TABLE devices
ADD COLUMN credential_created_at TEXT;

ALTER TABLE devices
ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 1
    CHECK (credential_version >= 1);

CREATE UNIQUE INDEX idx_devices_credential_hash
    ON devices (credential_hash)
    WHERE credential_hash IS NOT NULL;


-- =========================================================
-- DEVICE ACTIVATION TOKENS
--
-- Raw activation token is never persisted.
-- Only SHA-256(token) is stored.
-- =========================================================

CREATE TABLE device_activation_tokens (
    id TEXT PRIMARY KEY,

    store_id TEXT NOT NULL,

    token_hash TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'used',
                'revoked'
            )
        ),

    expires_at TEXT NOT NULL,

    used_at TEXT,
    used_device_id TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (store_id, used_device_id)
        REFERENCES devices(store_id, id)
        ON DELETE RESTRICT,

    UNIQUE (token_hash)
);

CREATE INDEX idx_device_activation_tokens_store_status
    ON device_activation_tokens (
        store_id,
        status
    );

CREATE INDEX idx_device_activation_tokens_expiry
    ON device_activation_tokens (
        expires_at
    );