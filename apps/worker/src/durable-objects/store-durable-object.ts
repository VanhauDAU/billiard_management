import { DurableObject } from 'cloudflare:workers'
type MetadataRow = {
  key: string
  value: string
}

export class StoreDurableObject extends DurableObject {
  private readonly sql: SqlStorage

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)

    this.sql = ctx.storage.sql

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS system_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    this.sql.exec(`
      INSERT OR IGNORE INTO system_metadata (
        key,
        value
      )
      VALUES (
        'schema_version',
        '1'
      )
    `)
  }

  private ensureStoreIdentity(storeId: string): void {
    const row = this.sql
      .exec<MetadataRow>(
        `
          SELECT key, value
          FROM system_metadata
          WHERE key = 'store_id'
          LIMIT 1
        `
      )
      .toArray()[0]

    if (!row) {
      this.sql.exec(
        `
          INSERT INTO system_metadata (
            key,
            value
          )
          VALUES (
            'store_id',
            ?
          )
        `,
        storeId
      )

      return
    }

    if (row.value !== storeId) {
      throw new Error('store_identity_mismatch')
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/health') {
      return Response.json(
        {
          ok: false,
          error: 'not_found'
        },
        {
          status: 404
        }
      )
    }

    const storeId = request.headers.get('x-store-id')

    if (!storeId) {
      return Response.json(
        {
          ok: false,
          error: 'missing_store_id'
        },
        {
          status: 400
        }
      )
    }

    try {
      this.ensureStoreIdentity(storeId)

      const metadata = this.sql
        .exec<MetadataRow>(
          `
            SELECT key, value
            FROM system_metadata
            WHERE key IN (
              'store_id',
              'schema_version'
            )
            ORDER BY key
          `
        )
        .toArray()

      const values = Object.fromEntries(
        metadata.map((row) => [row.key, row.value])
      )

      return Response.json({
        ok: true,
        service: 'store-durable-object',
        storeId: values.store_id,
        storage: 'sqlite',
        schemaVersion: Number(values.schema_version)
      })
    } catch (error) {
      console.error('Store DO health failed:', error)

      return Response.json(
        {
          ok: false,
          error: 'store_do_unavailable'
        },
        {
          status: 500
        }
      )
    }
  }
}