import {
  describe,
  expect,
  it
} from 'vitest'

import {
  CommandEnvelopeSchema,
  TrustedCommandEnvelopeSchema
} from '@billiards/contracts'

describe(
  'Command envelope trust boundary',
  () => {
    const baseCommand = {
      commandId:
        'd716347a-3fa1-4c76-a891-bdad117ffba8',
      issuedAt:
        '2026-08-18T03:30:00.000Z',
      commandType:
        'table.open',
      payload: {
        tableId: 'table-01'
      }
    }

    it(
      'accepts client intent without identity authority fields',
      () => {
        expect(
          CommandEnvelopeSchema.safeParse(
            baseCommand
          ).success
        ).toBe(true)
      }
    )

    it(
      'rejects client-controlled Store, Device and Actor identity',
      () => {
        const result =
          CommandEnvelopeSchema.safeParse({
            ...baseCommand,
            storeId: 'store-a',
            deviceId:
              '8c411241-632b-49da-bbc1-83556284c9da',
            actorId: 'employee-a'
          })

        expect(result.success)
          .toBe(false)
      }
    )

    it(
      'accepts identity only in the trusted server envelope',
      () => {
        const result =
          TrustedCommandEnvelopeSchema.safeParse({
            ...baseCommand,
            storeId: 'store-a',
            deviceId:
              '8c411241-632b-49da-bbc1-83556284c9da',
            actorId: 'employee-a'
          })

        expect(result.success)
          .toBe(true)
      }
    )
  }
)
