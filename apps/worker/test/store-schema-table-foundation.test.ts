import {
  env
} from 'cloudflare:workers'

import {
  runInDurableObject
} from 'cloudflare:test'

import {
  describe,
  expect,
  it
} from 'vitest'

import {
  CURRENT_STORE_SCHEMA_VERSION,
  migrateStoreSchema
} from '../src/durable-objects/store-schema'


async function initializeStore(
  prefix:
    string
) {
  const storeId =
    [
      prefix,
      crypto.randomUUID()
    ].join('-')


  const stub =
    env.STORE_DO
      .getByName(
        storeId
      )


  const response =
    await stub.fetch(
      new Request(
        'https://store-do/health',
        {
          headers: {
            'x-store-id':
              storeId
          }
        }
      )
    )


  expect(
    response.status
  ).toBe(200)


  return {
    storeId,
    stub
  }
}


describe(
  'Store schema v2 table foundation',

  () => {
    it(
      'initializes a fresh Store at schema version 2 with the required tables',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'schema-v2-fresh'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            const version =
              state.storage.sql
                .exec<{
                  value:
                    string
                }>(`
                  SELECT value

                  FROM system_metadata

                  WHERE
                    key =
                      'schema_version'

                  LIMIT 1
                `)
                .toArray()[0]


            expect(
              Number(
                version.value
              )
            ).toBe(
              CURRENT_STORE_SCHEMA_VERSION
            )


            expect(
              CURRENT_STORE_SCHEMA_VERSION
            ).toBe(2)


            const tables =
              state.storage.sql
                .exec<{
                  name:
                    string
                }>(`
                  SELECT name

                  FROM sqlite_master

                  WHERE
                    type = 'table'

                    AND name IN (
                      'table_types',
                      'billiard_tables',
                      'processed_commands'
                    )

                  ORDER BY
                    name
                `)
                .toArray()
                .map(
                  (row) =>
                    row.name
                )


            expect(
              tables
            ).toEqual([
              'billiard_tables',
              'processed_commands',
              'table_types'
            ])
          }
        )
      }
    )


    it(
      'enables SQLite foreign-key enforcement',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'schema-v2-fk'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            const row =
              state.storage.sql
                .exec<{
                  foreign_keys:
                    number
                }>(
                  'PRAGMA foreign_keys'
                )
                .toArray()[0]


            expect(
              Number(
                row.foreign_keys
              )
            ).toBe(1)
          }
        )
      }
    )


    it(
      'migrates a simulated schema-v1 Store to v2 idempotently',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'schema-v1-to-v2'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            /*
             * Simulate an old Store whose
             * persisted schema is still v1.
             */
            state.storage.sql.exec(`
              DROP TABLE
                processed_commands;

              DROP TABLE
                billiard_tables;

              DROP TABLE
                table_types;


              UPDATE system_metadata

              SET
                value = '1',
                updated_at =
                  CURRENT_TIMESTAMP

              WHERE
                key =
                  'schema_version';
            `)


            migrateStoreSchema(
              state.storage
            )

            migrateStoreSchema(
              state.storage
            )


            const row =
              state.storage.sql
                .exec<{
                  value:
                    string
                }>(`
                  SELECT value

                  FROM system_metadata

                  WHERE
                    key =
                      'schema_version'

                  LIMIT 1
                `)
                .toArray()[0]


            expect(
              Number(
                row.value
              )
            ).toBe(2)
          }
        )
      }
    )


    it(
      'keeps TableType names unique by normalized name even when disabled',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'table-type-unique'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            state.storage.sql.exec(
              `
                INSERT INTO table_types (
                  id,
                  name,
                  name_normalized,
                  color_hex,
                  status,
                  sort_order
                )

                VALUES (
                  ?,
                  ?,
                  ?,
                  ?,
                  'disabled',
                  0
                )
              `,

              crypto.randomUUID(),
              'Pool',
              'pool',
              '#2563EB'
            )


            expect(
              () => {
                state.storage.sql.exec(
                  `
                    INSERT INTO table_types (
                      id,
                      name,
                      name_normalized,
                      color_hex,
                      status,
                      sort_order
                    )

                    VALUES (
                      ?,
                      ?,
                      ?,
                      ?,
                      'active',
                      1
                    )
                  `,

                  crypto.randomUUID(),
                  'POOL',
                  'pool',
                  '#16A34A'
                )
              }
            ).toThrow()
          }
        )
      }
    )


    it(
      'keeps BilliardTable names unique across the Store',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'table-unique'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            const typeA =
              crypto.randomUUID()

            const typeB =
              crypto.randomUUID()


            state.storage.sql.exec(
              `
                INSERT INTO table_types (
                  id,
                  name,
                  name_normalized,
                  color_hex,
                  sort_order
                )

                VALUES (
                  ?,
                  'Pool',
                  'pool',
                  '#2563EB',
                  0
                )
              `,
              typeA
            )


            state.storage.sql.exec(
              `
                INSERT INTO table_types (
                  id,
                  name,
                  name_normalized,
                  color_hex,
                  sort_order
                )

                VALUES (
                  ?,
                  'Carom',
                  'carom',
                  '#16A34A',
                  1
                )
              `,
              typeB
            )


            state.storage.sql.exec(
              `
                INSERT INTO billiard_tables (
                  id,
                  table_type_id,
                  name,
                  name_normalized,
                  sort_order
                )

                VALUES (
                  ?,
                  ?,
                  'Bàn 01',
                  'bàn 01',
                  0
                )
              `,

              crypto.randomUUID(),
              typeA
            )


            expect(
              () => {
                state.storage.sql.exec(
                  `
                    INSERT INTO billiard_tables (
                      id,
                      table_type_id,
                      name,
                      name_normalized,
                      sort_order
                    )

                    VALUES (
                      ?,
                      ?,
                      'BÀN 01',
                      'bàn 01',
                      1
                    )
                  `,

                  crypto.randomUUID(),
                  typeB
                )
              }
            ).toThrow()
          }
        )
      }
    )


    it(
      'enforces TableType color status and sort-order constraints',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'table-type-constraints'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            expect(
              () => {
                state.storage.sql.exec(
                  `
                    INSERT INTO table_types (
                      id,
                      name,
                      name_normalized,
                      color_hex
                    )

                    VALUES (
                      ?,
                      'Bad color',
                      'bad color',
                      '#12GG00'
                    )
                  `,

                  crypto.randomUUID()
                )
              }
            ).toThrow()


            expect(
              () => {
                state.storage.sql.exec(
                  `
                    INSERT INTO table_types (
                      id,
                      name,
                      name_normalized,
                      color_hex,
                      status
                    )

                    VALUES (
                      ?,
                      'Bad status',
                      'bad status',
                      '#2563EB',
                      'deleted'
                    )
                  `,

                  crypto.randomUUID()
                )
              }
            ).toThrow()


            expect(
              () => {
                state.storage.sql.exec(
                  `
                    INSERT INTO table_types (
                      id,
                      name,
                      name_normalized,
                      color_hex,
                      sort_order
                    )

                    VALUES (
                      ?,
                      'Bad order',
                      'bad order',
                      '#2563EB',
                      -1
                    )
                  `,

                  crypto.randomUUID()
                )
              }
            ).toThrow()
          }
        )
      }
    )


    it(
      'rejects a BilliardTable whose TableType does not exist',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'table-invalid-type'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            expect(
              () => {
                state.storage.sql.exec(
                  `
                    INSERT INTO billiard_tables (
                      id,
                      table_type_id,
                      name,
                      name_normalized
                    )

                    VALUES (
                      ?,
                      ?,
                      'Bàn 01',
                      'bàn 01'
                    )
                  `,

                  crypto.randomUUID(),
                  crypto.randomUUID()
                )
              }
            ).toThrow()
          }
        )
      }
    )


    it(
      'prevents deleting a TableType referenced by a table',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'table-type-delete-restrict'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            const typeId =
              crypto.randomUUID()


            state.storage.sql.exec(
              `
                INSERT INTO table_types (
                  id,
                  name,
                  name_normalized,
                  color_hex
                )

                VALUES (
                  ?,
                  'Pool',
                  'pool',
                  '#2563EB'
                )
              `,

              typeId
            )


            state.storage.sql.exec(
              `
                INSERT INTO billiard_tables (
                  id,
                  table_type_id,
                  name,
                  name_normalized
                )

                VALUES (
                  ?,
                  ?,
                  'Bàn 01',
                  'bàn 01'
                )
              `,

              crypto.randomUUID(),
              typeId
            )


            expect(
              () => {
                state.storage.sql.exec(
                  `
                    DELETE FROM table_types

                    WHERE
                      id = ?
                  `,

                  typeId
                )
              }
            ).toThrow()
          }
        )
      }
    )


    it(
      'enforces processed command identity and JSON result constraints',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'processed-command-constraints'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            const commandId =
              crypto.randomUUID()

            const fingerprint =
              'a'.repeat(64)


            state.storage.sql.exec(
              `
                INSERT INTO processed_commands (
                  command_id,
                  command_type,
                  request_fingerprint,
                  actor_id,
                  device_id,
                  client_issued_at,
                  outcome_kind,
                  result_json
                )

                VALUES (
                  ?,
                  'CreateBilliardTable',
                  ?,
                  'actor-1',
                  'device-1',
                  '2026-08-18T00:00:00.000Z',
                  'success',
                  '{"ok":true}'
                )
              `,

              commandId,
              fingerprint
            )


            expect(
              () => {
                state.storage.sql.exec(
                  `
                    INSERT INTO processed_commands (
                      command_id,
                      command_type,
                      request_fingerprint,
                      actor_id,
                      device_id,
                      client_issued_at,
                      outcome_kind,
                      result_json
                    )

                    VALUES (
                      ?,
                      'CreateBilliardTable',
                      ?,
                      'actor-1',
                      'device-1',
                      '2026-08-18T00:00:00.000Z',
                      'success',
                      '{"ok":true}'
                    )
                  `,

                  commandId,
                  fingerprint
                )
              }
            ).toThrow()


            expect(
              () => {
                state.storage.sql.exec(
                  `
                    INSERT INTO processed_commands (
                      command_id,
                      command_type,
                      request_fingerprint,
                      actor_id,
                      device_id,
                      client_issued_at,
                      outcome_kind,
                      result_json
                    )

                    VALUES (
                      ?,
                      'CreateBilliardTable',
                      ?,
                      'actor-1',
                      'device-1',
                      '2026-08-18T00:00:00.000Z',
                      'success',
                      'not-json'
                    )
                  `,

                  crypto.randomUUID(),
                  fingerprint
                )
              }
            ).toThrow()
          }
        )
      }
    )


    it(
      'isolates identical table identities between Stores',

      async () => {
        const storeA =
          await initializeStore(
            'table-isolation-a'
          )

        const storeB =
          await initializeStore(
            'table-isolation-b'
          )

        const sharedTypeId =
          crypto.randomUUID()

        const sharedTableId =
          crypto.randomUUID()


        for (
          const store
          of [
            storeA,
            storeB
          ]
        ) {
          await runInDurableObject(
            store.stub,

            async (
              _instance,
              state
            ) => {
              state.storage.sql.exec(
                `
                  INSERT INTO table_types (
                    id,
                    name,
                    name_normalized,
                    color_hex
                  )

                  VALUES (
                    ?,
                    'Pool',
                    'pool',
                    '#2563EB'
                  )
                `,

                sharedTypeId
              )


              state.storage.sql.exec(
                `
                  INSERT INTO billiard_tables (
                    id,
                    table_type_id,
                    name,
                    name_normalized
                  )

                  VALUES (
                    ?,
                    ?,
                    'Bàn 01',
                    'bàn 01'
                  )
                `,

                sharedTableId,
                sharedTypeId
              )
            }
          )
        }


        for (
          const store
          of [
            storeA,
            storeB
          ]
        ) {
          await runInDurableObject(
            store.stub,

            async (
              _instance,
              state
            ) => {
              const rows =
                state.storage.sql
                  .exec<{
                    id:
                      string
                  }>(`
                    SELECT id

                    FROM billiard_tables

                    WHERE
                      id = ?
                  `,
                  sharedTableId
                  )
                  .toArray()


              expect(
                rows
              ).toHaveLength(1)
            }
          )
        }
      }
    )


    it(
      'rolls back a failed schema-v2 migration without advancing the version',

      async () => {
        const {
          stub
        } =
          await initializeStore(
            'schema-v2-rollback'
          )


        await runInDurableObject(
          stub,

          async (
            _instance,
            state
          ) => {
            state.storage.sql.exec(`
              DROP TABLE
                processed_commands;

              DROP TABLE
                billiard_tables;

              DROP TABLE
                table_types;


              UPDATE system_metadata

              SET
                value = '1',
                updated_at =
                  CURRENT_TIMESTAMP

              WHERE
                key =
                  'schema_version';


              /*
               * Deliberately block migration 002
               * after it has begun creating objects.
               */
              CREATE TABLE billiard_tables (
                id TEXT PRIMARY KEY
              ) STRICT;
            `)


            expect(
              () => {
                migrateStoreSchema(
                  state.storage
                )
              }
            ).toThrow()


            const version =
              state.storage.sql
                .exec<{
                  value:
                    string
                }>(`
                  SELECT value

                  FROM system_metadata

                  WHERE
                    key =
                      'schema_version'

                  LIMIT 1
                `)
                .toArray()[0]


            expect(
              version.value
            ).toBe('1')


            const tableTypes =
              state.storage.sql
                .exec<{
                  name:
                    string
                }>(`
                  SELECT name

                  FROM sqlite_master

                  WHERE
                    type = 'table'

                    AND name =
                      'table_types'
                `)
                .toArray()


            /*
             * table_types was created before
             * the deliberate billiard_tables
             * conflict, so this proves DDL
             * rolled back with the migration.
             */
            expect(
              tableTypes
            ).toHaveLength(0)
          }
        )
      }
    )
  }
)