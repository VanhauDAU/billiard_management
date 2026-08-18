import {
  DurableObject
} from 'cloudflare:workers'

import type {
  TableConfigurationResponse,
  TableManagementCommand
} from '@billiards/contracts'

import {
  migrateStoreSchema
} from './store-schema'

import {
  StoreTableRepository
} from './table/store-table-repository'

import {
  StoreTableCommandRepository
} from './table/store-table-command-repository'

import {
  StoreTableCommandExecutor
} from './table/store-table-command-executor'

import type {
  StoreTableCommandExecutionContext
} from './table/store-table-command-executor'

import type {
  TableCommandRpcResult
} from './table/table-command-result'


type MetadataRow = {
  key: string
  value: string
}


export class StoreDurableObject extends DurableObject {
  private readonly sql:
    SqlStorage

  private readonly tableRepository:
    StoreTableRepository

  private readonly tableCommandExecutor:
    StoreTableCommandExecutor


  constructor(
    ctx:
      DurableObjectState,

    env:
      CloudflareBindings
  ) {
    super(
      ctx,
      env
    )


    this.sql =
      ctx.storage.sql


    this.tableRepository =
      new StoreTableRepository(
        this.sql
      )


    const tableCommandRepository =
      new StoreTableCommandRepository(
        this.sql
      )


    this.tableCommandExecutor =
      new StoreTableCommandExecutor(
        ctx.storage,
        tableCommandRepository
      )


    /*
     * Schema migration must complete before
     * this Durable Object accepts requests
     * or future RPC calls.
     */
    ctx.blockConcurrencyWhile(
      async () => {
        migrateStoreSchema(
          ctx.storage
        )
      }
    )
  }


  private ensureStoreIdentity(
    storeId:
      string
  ): void {
    const row =
      this.sql
        .exec<MetadataRow>(
          `
            SELECT
              key,
              value

            FROM system_metadata

            WHERE
              key = 'store_id'

            LIMIT 1
          `
        )
        .toArray()[0]


    if (
      !row
    ) {
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


    if (
      row.value !==
        storeId
    ) {
      throw new Error(
        'store_identity_mismatch'
      )
    }
  }


  async getTableConfiguration(
    storeId:
      string
  ): Promise<
    TableConfigurationResponse
  > {
    if (
      typeof storeId !==
        'string' ||

      storeId.length === 0
    ) {
      throw new Error(
        'invalid_store_id'
      )
    }


    /*
     * storeId supplied here will eventually
     * come from trusted Worker DeviceContext.
     *
     * It is NOT accepted from Desktop/client
     * as tenant authority.
     */
    this.ensureStoreIdentity(
      storeId
    )


    return (
      this.tableRepository
        .getConfiguration()
    )
  }


  async executeTableCommand(
    context:
      StoreTableCommandExecutionContext,

    command:
      TableManagementCommand
  ): Promise<
    TableCommandRpcResult
  > {
    /*
     * Expected validation/business errors are
     * returned as structured RPC results.
     *
     * Store identity mismatch remains an
     * infrastructure/security invariant and
     * intentionally throws.
     */
    if (
      typeof context?.storeId !==
        'string' ||

      context.storeId.length === 0
    ) {
      return {
        ok: false,
        replayed: false,
        error:
          'invalid_execution_context'
      }
    }


    this.ensureStoreIdentity(
      context.storeId
    )


    return (
      this.tableCommandExecutor
        .execute(
          context,
          command
        )
    )
  }


  async fetch(
    request:
      Request
  ): Promise<Response> {
    const url =
      new URL(
        request.url
      )


    if (
      url.pathname !==
        '/health'
    ) {
      return Response.json(
        {
          ok: false,
          error:
            'not_found'
        },
        {
          status: 404
        }
      )
    }


    const storeId =
      request.headers
        .get(
          'x-store-id'
        )


    if (
      !storeId
    ) {
      return Response.json(
        {
          ok: false,
          error:
            'missing_store_id'
        },
        {
          status: 400
        }
      )
    }


    try {
      this.ensureStoreIdentity(
        storeId
      )


      const metadata =
        this.sql
          .exec<MetadataRow>(
            `
              SELECT
                key,
                value

              FROM system_metadata

              WHERE
                key IN (
                  'store_id',
                  'schema_version'
                )

              ORDER BY
                key
            `
          )
          .toArray()


      const values =
        Object.fromEntries(
          metadata.map(
            (
              row
            ) => [
              row.key,
              row.value
            ]
          )
        )


      return Response.json({
        ok: true,

        service:
          'store-durable-object',

        storeId:
          values.store_id,

        storage:
          'sqlite',

        schemaVersion:
          Number(
            values.schema_version
          )
      })
    } catch (
      error
    ) {
      console.error(
        'Store DO health failed:',
        error
      )


      return Response.json(
        {
          ok: false,

          error:
            'store_do_unavailable'
        },
        {
          status: 500
        }
      )
    }
  }
}