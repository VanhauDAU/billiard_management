## Summary

<!-- What changed and why? Keep this focused on the user/domain outcome. -->

## Scope

- [ ] Worker / API
- [ ] D1 migration / control plane
- [ ] Store Durable Object / operational data
- [ ] Desktop Main / Preload / Renderer
- [ ] Contracts / domain
- [ ] Mobile
- [ ] Docs / CI / release

## Trust and tenant impact

- [ ] No client-supplied `storeId`, `deviceId`, `actorId` or permission is treated as authority.
- [ ] Store isolation was considered and covered by tests where relevant.
- [ ] Device/Auth/Permission middleware order is correct for protected routes.
- [ ] Renderer does not receive raw Device/Auth credentials.
- [ ] Sensitive/auth responses and logs do not expose raw credentials or PINs.

## Data / migration impact

- [ ] No schema change.
- [ ] Schema change has a reviewed migration.
- [ ] Existing local/remote data compatibility was considered.
- [ ] Rollback/recovery behavior is documented when the migration is not trivially reversible.

## Validation

Run from repository root:

```bash
pnpm run ci
```

Additional validation performed:

<!-- Desktop smoke, local D1 migration, packaged Windows smoke, printer smoke, etc. -->

## Docs / roadmap

- [ ] README/ARCHITECTURE/PROGRESS/ROADMAP updated if behavior or milestone status changed.
- [ ] New invariant has an ADR when it is a long-lived architectural decision.

## Before merge

- [ ] CI green on the latest commit.
- [ ] No unrelated generated/local files included.
- [ ] Security-sensitive changes have regression tests.
