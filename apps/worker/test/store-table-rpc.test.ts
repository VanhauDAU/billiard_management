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
  TableConfigurationResponseSchema
} from '@billiards/contracts'


function createStore(
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


  return {
    storeId,
    stub
  }
}


describe(
  'Store table RPC',

  () => {
    it(
      'returns an empty configuration for a fresh Store',

      async () => {
        const {
          storeId,
          stub
        } =
          createStore(
            'table-rpc-empty'
          )


        const result =
          await stub
            .getTableConfiguration(
              storeId
            )


        expect(
          result
        ).toEqual({
          tableTypes: [],
          tables: []
        })


        expect(
          TableConfigurationResponseSchema
            .safeParse(
              result
            )
            .success
        ).toBe(true)
      }
    )


    it(
      'returns table configuration ordered by sort order',

      async () => {
        const {
          storeId,
          stub
        } =
          createStore(
            'table-rpc-order'
          )


        /*
         * First RPC initializes/persists
         * the Store identity.
         */
        await stub
          .getTableConfiguration(
            storeId
          )


        const typePool =
          crypto.randomUUID()

        const typeCarom =
          crypto.randomUUID()

        const table1 =
          crypto.randomUUID()

        const table2 =
          crypto.randomUUID()


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
                  'Pool',
                  'pool',
                  '#2563EB',
                  'active',
                  10
                )
              `,

              typePool
            )


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
                  'Carom',
                  'carom',
                  '#16A34A',
                  'active',
                  0
                )
              `,

              typeCarom
            )


            state.storage.sql.exec(
              `
                INSERT INTO billiard_tables (
                  id,
                  table_type_id,
                  name,
                  name_normalized,
                  status,
                  sort_order
                )

                VALUES (
                  ?,
                  ?,
                  'Bàn 02',
                  'bàn 02',
                  'active',
                  10
                )
              `,

              table2,
              typePool
            )


            state.storage.sql.exec(
              `
                INSERT INTO billiard_tables (
                  id,
                  table_type_id,
                  name,
                  name_normalized,
                  status,
                  sort_order
                )

                VALUES (
                  ?,
                  ?,
                  'Bàn 01',
                  'bàn 01',
                  'active',
                  0
                )
              `,

              table1,
              typeCarom
            )
          }
        )


        const result =
          await stub
            .getTableConfiguration(
              storeId
            )


        expect(
          result.tableTypes
            .map(
              (
                item
              ) =>
                item.name
            )
        ).toEqual([
          'Carom',
          'Pool'
        ])


        expect(
          result.tables
            .map(
              (
                item
              ) =>
                item.name
            )
        ).toEqual([
          'Bàn 01',
          'Bàn 02'
        ])
      }
    )


    it(
      'does not expose persistence-only normalized names',

      async () => {
        const {
          storeId,
          stub
        } =
          createStore(
            'table-rpc-safe-view'
          )


        await stub
          .getTableConfiguration(
            storeId
          )


        const typeId =
          crypto.randomUUID()


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
                  color_hex
                )

                VALUES (
                  ?,
                  'Pool VIP',
                  'pool vip',
                  '#2563EB'
                )
              `,

              typeId
            )
          }
        )


        const result =
          await stub
            .getTableConfiguration(
              storeId
            )


        expect(
          result.tableTypes[0]
        ).toEqual({
          id:
            typeId,

          name:
            'Pool VIP',

          colorHex:
            '#2563EB',

          status:
            'active',

          sortOrder:
            0
        })


        expect(
          'nameNormalized'
          in result.tableTypes[0]
        ).toBe(false)
      }
    )


    it(
      'isolates identical table identities between Stores',

      async () => {
        const storeA =
          createStore(
            'table-rpc-store-a'
          )

        const storeB =
          createStore(
            'table-rpc-store-b'
          )


        const sharedTypeId =
          crypto.randomUUID()

        const sharedTableId =
          crypto.randomUUID()


        for (
          const [
            store,
            typeName,
            tableName
          ]
          of [
            [
              storeA,
              'Pool A',
              'Bàn A'
            ],

            [
              storeB,
              'Pool B',
              'Bàn B'
            ]
          ] as const
        ) {
          await store.stub
            .getTableConfiguration(
              store.storeId
            )


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
                    ?,
                    ?,
                    '#2563EB'
                  )
                `,

                sharedTypeId,
                typeName,
                typeName
                  .toLocaleLowerCase(
                    'vi-VN'
                  )
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
                    ?,
                    ?
                  )
                `,

                sharedTableId,
                sharedTypeId,
                tableName,
                tableName
                  .toLocaleLowerCase(
                    'vi-VN'
                  )
              )
            }
          )
        }


        const resultA =
          await storeA.stub
            .getTableConfiguration(
              storeA.storeId
            )

        const resultB =
          await storeB.stub
            .getTableConfiguration(
              storeB.storeId
            )


        expect(
          resultA.tables[0]
            .name
        ).toBe(
          'Bàn A'
        )


        expect(
          resultB.tables[0]
            .name
        ).toBe(
          'Bàn B'
        )
      }
    )


    it('rejects a mismatched Store identity on the same Durable Object',

    async () => {
        const {
        storeId,
        stub
        } =
        createStore(
            'table-rpc-identity'
        )


        /*
        * Initialize Store identity through the
        * real RPC path first.
        */
        await stub
        .getTableConfiguration(
            storeId
        )


        /*
        * @cloudflare/vitest-pool-workers can
        * report an intentionally thrown remote
        * Durable Object RPC exception as an
        * unhandled rejection even when the test
        * catches the returned Promise.
        *
        * Test the exact same public method on
        * the actual Durable Object instance so
        * the identity invariant is exercised
        * without crossing the RPC exception
        * transport boundary.
        */
        await runInDurableObject(
        stub,

        async (
            instance
        ) => {
            const otherStoreId =
            [
                storeId,
                'other'
            ].join('-')


            await expect(
            instance
                .getTableConfiguration(
                otherStoreId
                )
            ).rejects.toThrow(
            'store_identity_mismatch'
            )


            /*
            * Defensive regression:
            * the failed mismatch attempt must
            * not mutate or corrupt Store identity.
            */
            const result =
            await instance
                .getTableConfiguration(
                storeId
                )


            expect(
            result
            ).toEqual({
            tableTypes: [],
            tables: []
            })
        }
        )
    }
    )
  }
)