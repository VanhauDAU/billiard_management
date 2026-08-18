import {
  describe,
  expect,
  it
} from 'vitest'

import {
  BilliardTableViewSchema,
  CreateBilliardTableCommandSchema,
  CreateTableTypeCommandSchema,
  ReorderBilliardTablesCommandSchema,
  TableColorHexSchema,
  TableManagementCommandSchema,
  TableTypeViewSchema,
  normalizeTableDisplayName,
  normalizeTableNameKey
} from '@billiards/contracts'


const COMMAND_ID =
  'd716347a-3fa1-4c76-a891-bdad117ffba8'

const TABLE_TYPE_ID =
  'b9aa4248-a62e-4f82-aec1-58cd27bf3c65'

const TABLE_ID =
  '9713c753-0bf9-45f0-beb7-bbc7b605dd70'

const ISSUED_AT =
  '2026-08-18T08:00:00.000Z'


describe(
  'M1.4 table contracts',
  () => {
    it(
      'normalizes Unicode whitespace and case deterministically',
      () => {
        const input =
          '  Ba\u0300n   ０１  '


        expect(
          normalizeTableDisplayName(
            input
          )
        ).toBe(
          'Bàn 01'
        )


        expect(
          normalizeTableNameKey(
            input
          )
        ).toBe(
          'bàn 01'
        )
      }
    )


    it(
      'normalizes valid colors to uppercase hex',
      () => {
        const result =
          TableColorHexSchema.parse(
            '#25a3eb'
          )


        expect(
          result
        ).toBe(
          '#25A3EB'
        )
      }
    )


    it(
      'rejects malformed table colors',
      () => {
        expect(
          TableColorHexSchema.safeParse(
            '#12GG00'
          ).success
        ).toBe(false)


        expect(
          TableColorHexSchema.safeParse(
            '2563EB'
          ).success
        ).toBe(false)
      }
    )


    it(
      'accepts and normalizes CreateTableType intent',
      () => {
        const result =
          CreateTableTypeCommandSchema
            .parse({
              commandId:
                COMMAND_ID,

              issuedAt:
                ISSUED_AT,

              commandType:
                'CreateTableType',

              payload: {
                tableTypeId:
                  TABLE_TYPE_ID,

                name:
                  '  Pool   VIP ',

                colorHex:
                  '#2563eb'
              }
            })


        expect(
          result.payload.name
        ).toBe(
          'Pool VIP'
        )


        expect(
          result.payload.colorHex
        ).toBe(
          '#2563EB'
        )
      }
    )


    it(
      'does not accept derived persistence state from the client',
      () => {
        const result =
          CreateTableTypeCommandSchema
            .safeParse({
              commandId:
                COMMAND_ID,

              issuedAt:
                ISSUED_AT,

              commandType:
                'CreateTableType',

              payload: {
                tableTypeId:
                  TABLE_TYPE_ID,

                name:
                  'Pool',

                nameNormalized:
                  'pool',

                colorHex:
                  '#2563EB',

                sortOrder:
                  999
              }
            })


        expect(
          result.success
        ).toBe(false)
      }
    )


    it(
      'does not accept trusted Store Device or Actor identity from the client',
      () => {
        const result =
          CreateBilliardTableCommandSchema
            .safeParse({
              commandId:
                COMMAND_ID,

              issuedAt:
                ISSUED_AT,

              commandType:
                'CreateBilliardTable',

              storeId:
                'attacker-store',

              actorId:
                'attacker',

              deviceId:
                'e91eb1eb-32fd-44af-8f3d-7bbfd2135571',

              payload: {
                tableId:
                  TABLE_ID,

                tableTypeId:
                  TABLE_TYPE_ID,

                name:
                  'Bàn 01'
              }
            })


        expect(
          result.success
        ).toBe(false)
      }
    )


    it(
      'rejects duplicate IDs in a reorder command',
      () => {
        const result =
          ReorderBilliardTablesCommandSchema
            .safeParse({
              commandId:
                COMMAND_ID,

              issuedAt:
                ISSUED_AT,

              commandType:
                'ReorderBilliardTables',

              payload: {
                orderedTableIds: [
                  TABLE_ID,
                  TABLE_ID
                ]
              }
            })


        expect(
          result.success
        ).toBe(false)
      }
    )


    it(
      'rejects a commandType and payload contract mismatch',
      () => {
        const result =
          TableManagementCommandSchema
            .safeParse({
              commandId:
                COMMAND_ID,

              issuedAt:
                ISSUED_AT,

              commandType:
                'CreateTableType',

              payload: {
                tableId:
                  TABLE_ID,

                tableTypeId:
                  TABLE_TYPE_ID,

                name:
                  'Bàn 01'
              }
            })


        expect(
          result.success
        ).toBe(false)
      }
    )


    it(
      'does not expose operational playing state in the table master view',
      () => {
        const result =
          BilliardTableViewSchema
            .safeParse({
              id:
                TABLE_ID,

              tableTypeId:
                TABLE_TYPE_ID,

              name:
                'Bàn 01',

              status:
                'playing',

              sortOrder:
                0
            })


        expect(
          result.success
        ).toBe(false)
      }
    )


    it(
      'does not allow pricing fields in the M1.4 table type view',
      () => {
        const result =
          TableTypeViewSchema
            .safeParse({
              id:
                TABLE_TYPE_ID,

              name:
                'Pool',

              colorHex:
                '#2563EB',

              status:
                'active',

              sortOrder:
                0,

              hourlyRate:
                60000
            })


        expect(
          result.success
        ).toBe(false)
      }
    )
  }
)