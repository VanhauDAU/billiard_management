import { migration001Foundation } from './migration-001-foundation'
import type { StoreSchemaMigration } from './types'
import {
  migration002TableFoundation
} from './migration-002-table-foundation'
type MetadataRow = {
  value: string
}
type ForeignKeyPragmaRow = {
  foreign_keys:
    number
}


function configureSqlite(
  storage:
    DurableObjectStorage
): void {
  /*
   * SQLite foreign-key constraints must
   * be active for every Store DO instance.
   *
   * Do not rely only on application checks
   * for Table → TableType integrity.
   */
  storage.sql.exec(
    'PRAGMA foreign_keys = ON'
  )


  const row =
    storage.sql
      .exec<ForeignKeyPragmaRow>(
        'PRAGMA foreign_keys'
      )
      .toArray()[0]


  if (
    Number(
      row?.foreign_keys ?? 0
    ) !== 1
  ) {
    throw new Error(
      'store_sqlite_foreign_keys_unavailable'
    )
  }
}
const migrations:
StoreSchemaMigration[] = [
  migration001Foundation,
  migration002TableFoundation
]

export const CURRENT_STORE_SCHEMA_VERSION =
  migrations.at(-1)?.version ?? 0

function bootstrapMetadata(
  storage: DurableObjectStorage
): void {
  storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS system_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  storage.sql.exec(`
    INSERT OR IGNORE INTO system_metadata (
      key,
      value
    )
    VALUES (
      'schema_version',
      '0'
    )
  `)
}

function getSchemaVersion(
  storage: DurableObjectStorage
): number {
  const row = storage.sql
    .exec<MetadataRow>(`
      SELECT value
      FROM system_metadata
      WHERE key = 'schema_version'
      LIMIT 1
    `)
    .toArray()[0]

  const version = Number(row?.value ?? 0)

  if (!Number.isInteger(version) || version < 0) {
    throw new Error('invalid_store_schema_version')
  }

  return version
}

function setSchemaVersion(
  storage: DurableObjectStorage,
  version: number
): void {
  storage.sql.exec(
    `
      UPDATE system_metadata
      SET
        value = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE key = 'schema_version'
    `,
    String(version)
  )
}

function assertMigrationSequence(): void {
  for (let index = 0; index < migrations.length; index += 1) {
    const expectedVersion = index + 1
    const migration = migrations[index]

    if (migration.version !== expectedVersion) {
      throw new Error('invalid_store_schema_migration_sequence')
    }
  }
}

export function migrateStoreSchema(
  storage:
    DurableObjectStorage
): void {
  assertMigrationSequence()

  configureSqlite(
    storage
  )

  bootstrapMetadata(
    storage
  )

  let version = getSchemaVersion(storage)

  if (version > CURRENT_STORE_SCHEMA_VERSION) {
    throw new Error('unsupported_store_schema_version')
  }

  for (const migration of migrations) {
    if (migration.version <= version) {
      continue
    }

    if (migration.version !== version + 1) {
      throw new Error('store_schema_migration_gap')
    }

    storage.transactionSync(() => {
      migration.up(storage)

      setSchemaVersion(
        storage,
        migration.version
      )
    })

    version = migration.version
  }

  if (version !== CURRENT_STORE_SCHEMA_VERSION) {
    throw new Error('store_schema_migration_incomplete')
  }
}