-- Migration number: 0003
-- A single application installation may belong to only one Store at a time.
--
-- Cross-Store reassignment is intentionally NOT implicit in device activation.
-- A future transfer/recovery flow must explicitly release or move the existing
-- installation before another Store can activate it.

CREATE UNIQUE INDEX idx_devices_installation_id
    ON devices (installation_id);
