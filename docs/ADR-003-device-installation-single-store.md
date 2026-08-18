# ADR-003 - One installation belongs to one Store at a time

- Status: **Accepted**
- Date: **2026-08-18**

## Context

Desktop creates a persistent random `installationId` and sends it during device activation. Before this ADR, D1 enforced uniqueness only on:

```text
(store_id, installation_id)
```

That allowed the same application installation to have active Device rows in multiple Stores.

Automatically treating activation in Store B as a transfer from Store A is unsafe because `installationId` is an identifier, not a secret. A caller who knows an installation ID and has an activation token for another Store must not be able to revoke or move a Device in the original Store.

## Decision

For V1:

> One `installationId` belongs to at most one Store at a time.

D1 enforces a global unique index on `devices.installation_id`.

Activation behavior:

- same Store + same installation → allowed reactivation; rotate credential,
- different Store + same installation → fail with activation conflict,
- original Store/device remains unchanged,
- target Store activation token remains unconsumed when the transaction fails.

Cross-Store reassignment is a separate privileged recovery/transfer operation and is **not** implicit activation behavior.

## Consequences

### Positive

- prevents ambiguous ownership of one installation,
- prevents implicit cross-tenant transfer,
- avoids using a non-secret installation ID as transfer authorization,
- keeps credential rotation semantics clear,
- provides a DB-level invariant instead of relying only on application code.

### Trade-off

A legitimate machine transfer between Stores cannot be completed with a normal activation token alone. A future admin/owner recovery flow must explicitly release or transfer the installation.

Reinstalling the application may create a new installation ID; stale Device cleanup/revocation remains a device-management concern.

## Implementation

Migration:

```text
0003_enforce_global_device_installation.sql
```

adds:

```sql
CREATE UNIQUE INDEX idx_devices_installation_id
    ON devices (installation_id);
```

Integration tests verify that cross-Store activation returns conflict, the original credential remains valid, the second token remains active, and only the original Device row exists.