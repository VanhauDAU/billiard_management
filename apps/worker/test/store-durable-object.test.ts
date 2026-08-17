import { env } from 'cloudflare:workers'
import { runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import {
  CURRENT_STORE_SCHEMA_VERSION,
  migrateStoreSchema
} from '../src/durable-objects/store-schema'
async function initializeStore(storeId: string) {
  const stub = env.STORE_DO.getByName(storeId)

  const response = await stub.fetch(
    new Request('https://store-do/health', {
      headers: {
        'x-store-id': storeId
      }
    })
  )

  expect(response.status).toBe(200)

  return stub
}

describe('StoreDurableObject SQLite', () => {
  it('rejects a store schema newer than the running code', async () => {
  const stub = await initializeStore(
    'test-store-newer-schema'
  )

  await runInDurableObject(
    stub,
    async (_instance, state) => {
      state.storage.sql.exec(`
        UPDATE system_metadata
        SET value = '999'
        WHERE key = 'schema_version'
      `)

      expect(() => {
        migrateStoreSchema(state.storage)
      }).toThrow(
        'unsupported_store_schema_version'
      )
    }
  )
})
  it('runs store schema migration idempotently', async () => {
    const stub = await initializeStore(
      'test-store-schema-idempotent'
    )

    await runInDurableObject(
      stub,
      async (_instance, state) => {
        migrateStoreSchema(state.storage)
        migrateStoreSchema(state.storage)

        const rows = state.storage.sql
          .exec<{
            key: string
            value: string
          }>(`
            SELECT key, value
            FROM system_metadata
            WHERE key = 'schema_version'
          `)
          .toArray()

        expect(rows).toHaveLength(1)

        expect(Number(rows[0].value)).toBe(
          CURRENT_STORE_SCHEMA_VERSION
        )
      }
    )
  })
  it('initializes a fresh store at the current schema version', async () => {
    const stub = await initializeStore(
      'test-store-schema-version'
    )

    await runInDurableObject(
      stub,
      async (_instance, state) => {
        const row = state.storage.sql
          .exec<{ value: string }>(`
            SELECT value
            FROM system_metadata
            WHERE key = 'schema_version'
            LIMIT 1
          `)
          .toArray()[0]

        expect(Number(row.value)).toBe(
          CURRENT_STORE_SCHEMA_VERSION
        )
      }
    )
  })
  it('initializes and persists store identity', async () => {
    const storeId = 'test-store-identity'
    const stub = await initializeStore(storeId)

    await runInDurableObject(stub, async (_instance, state) => {
      const rows = state.storage.sql
        .exec<{
          key: string
          value: string
        }>(
          `
            SELECT key, value
            FROM system_metadata
            ORDER BY key
          `
        )
        .toArray()

      const metadata = Object.fromEntries(
        rows.map((row) => [row.key, row.value])
      )

      expect(metadata.store_id).toBe(storeId)
      expect(metadata.schema_version).toBe('1')
    })
  })

  it('can write and read SQLite data', async () => {
    const stub = await initializeStore('test-store-read-write')

    await runInDurableObject(stub, async (_instance, state) => {
      state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS smoke_items (
          id TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)

      state.storage.sql.exec(
        `
          INSERT INTO smoke_items (
            id,
            value
          )
          VALUES (?, ?)
        `,
        'item-1',
        'hello-store-do'
      )

      const row = state.storage.sql
        .exec<{
          id: string
          value: string
        }>(
          `
            SELECT id, value
            FROM smoke_items
            WHERE id = ?
          `,
          'item-1'
        )
        .toArray()[0]

      expect(row).toEqual({
        id: 'item-1',
        value: 'hello-store-do'
      })
    })
  })

  it('commits a successful transaction', async () => {
    const stub = await initializeStore('test-store-transaction-commit')

    await runInDurableObject(stub, async (_instance, state) => {
      state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS smoke_items (
          id TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)

      state.storage.transactionSync(() => {
        state.storage.sql.exec(
          `
            INSERT INTO smoke_items (id, value)
            VALUES (?, ?)
          `,
          'tx-1',
          'first'
        )

        state.storage.sql.exec(
          `
            INSERT INTO smoke_items (id, value)
            VALUES (?, ?)
          `,
          'tx-2',
          'second'
        )
      })

      const rows = state.storage.sql
        .exec<{ id: string }>(
          `
            SELECT id
            FROM smoke_items
            ORDER BY id
          `
        )
        .toArray()

      expect(rows.map((row) => row.id)).toEqual([
        'tx-1',
        'tx-2'
      ])
    })
  })

  it('rolls back a failed transaction', async () => {
    const stub = await initializeStore('test-store-transaction-rollback')

    await runInDurableObject(stub, async (_instance, state) => {
      state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS smoke_items (
          id TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)

      expect(() => {
        state.storage.transactionSync(() => {
          state.storage.sql.exec(
            `
              INSERT INTO smoke_items (id, value)
              VALUES (?, ?)
            `,
            'rollback-item',
            'should-not-exist'
          )

          throw new Error('force_rollback')
        })
      }).toThrow('force_rollback')

      const rows = state.storage.sql
        .exec<{ id: string }>(
          `
            SELECT id
            FROM smoke_items
            WHERE id = ?
          `,
          'rollback-item'
        )
        .toArray()

      expect(rows).toHaveLength(0)
    })
  })

  it('isolates SQLite data between stores', async () => {
    const storeA = await initializeStore('test-isolation-store-a')
    const storeB = await initializeStore('test-isolation-store-b')

    await runInDurableObject(storeA, async (_instance, state) => {
      state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS smoke_items (
          id TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)

      state.storage.sql.exec(
        `
          INSERT INTO smoke_items (id, value)
          VALUES (?, ?)
        `,
        'shared-id',
        'STORE_A'
      )
    })

    await runInDurableObject(storeB, async (_instance, state) => {
      state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS smoke_items (
          id TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)

      state.storage.sql.exec(
        `
          INSERT INTO smoke_items (id, value)
          VALUES (?, ?)
        `,
        'shared-id',
        'STORE_B'
      )
    })

    const valueA = await runInDurableObject(
      storeA,
      async (_instance, state) => {
        return state.storage.sql
          .exec<{ value: string }>(
            `
              SELECT value
              FROM smoke_items
              WHERE id = ?
            `,
            'shared-id'
          )
          .toArray()[0]?.value
      }
    )

    const valueB = await runInDurableObject(
      storeB,
      async (_instance, state) => {
        return state.storage.sql
          .exec<{ value: string }>(
            `
              SELECT value
              FROM smoke_items
              WHERE id = ?
            `,
            'shared-id'
          )
          .toArray()[0]?.value
      }
    )

    expect(valueA).toBe('STORE_A')
    expect(valueB).toBe('STORE_B')
  })

  it('rejects changing the identity of an initialized Durable Object', async () => {
    const stub = env.STORE_DO.getByName('test-store-identity-lock')

    const firstResponse = await stub.fetch(
      new Request('https://store-do/health', {
        headers: {
          'x-store-id': 'store-original'
        }
      })
    )

    expect(firstResponse.status).toBe(200)

    const secondResponse = await stub.fetch(
      new Request('https://store-do/health', {
        headers: {
          'x-store-id': 'store-other'
        }
      })
    )

    expect(secondResponse.status).toBe(500)

    const body = await secondResponse.json<{
      ok: boolean
      error: string
    }>()

    expect(body.ok).toBe(false)
    expect(body.error).toBe('store_do_unavailable')
  })
})