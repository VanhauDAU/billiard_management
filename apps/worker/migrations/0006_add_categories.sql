-- Migration number: 0006
-- Add categories table for store inventory and item categorization

CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_normalized TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled', 'deleted')),
    sort_order INTEGER NOT NULL DEFAULT 0
        CHECK (sort_order >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE CASCADE,

    UNIQUE (store_id, name_normalized)
);

CREATE INDEX idx_categories_store_status
    ON categories (store_id, status, sort_order);
