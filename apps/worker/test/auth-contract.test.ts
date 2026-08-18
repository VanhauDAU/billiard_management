import {
  describe,
  expect,
  it
} from 'vitest'

import {
  AuthContextSchema,
  EmployeePinSchema,
  PinLoginRequestSchema,
  PinLoginResponseSchema,
  SessionTokenSchema
} from '@billiards/contracts'

describe(
  'Employee PIN contract',
  () => {
    it.each([
      '0000',
      '0012',
      '1234',
      '12345',
      '123456'
    ])(
      'accepts PIN %s',
      (pin) => {
        expect(
          EmployeePinSchema
            .safeParse(pin)
            .success
        ).toBe(true)
      }
    )

    it.each([
      '',
      '123',
      '1234567',
      'abcd',
      '12 34',
      ' 1234',
      '1234 '
    ])(
      'rejects invalid PIN %s',
      (pin) => {
        expect(
          EmployeePinSchema
            .safeParse(pin)
            .success
        ).toBe(false)
      }
    )

    it(
      'rejects numeric PIN values',
      () => {
        expect(
          EmployeePinSchema
            .safeParse(1234)
            .success
        ).toBe(false)
      }
    )
  }
)

describe(
  'PIN login request contract',
  () => {
    it(
      'accepts only employeeId and PIN',
      () => {
        const result =
          PinLoginRequestSchema
            .safeParse({
              employeeId:
                'employee-01',

              pin:
                '0012'
            })

        expect(result.success)
          .toBe(true)
      }
    )

    it(
      'rejects client supplied storeId',
      () => {
        const result =
          PinLoginRequestSchema
            .safeParse({
              employeeId:
                'employee-01',

              pin:
                '123456',

              storeId:
                'fake-store'
            })

        expect(result.success)
          .toBe(false)
      }
    )

    it(
      'rejects client supplied deviceId',
      () => {
        const result =
          PinLoginRequestSchema
            .safeParse({
              employeeId:
                'employee-01',

              pin:
                '123456',

              deviceId:
                'fake-device'
            })

        expect(result.success)
          .toBe(false)
      }
    )

    it(
      'rejects client supplied actorId',
      () => {
        const result =
          PinLoginRequestSchema
            .safeParse({
              employeeId:
                'employee-01',

              pin:
                '123456',

              actorId:
                'owner'
            })

        expect(result.success)
          .toBe(false)
      }
    )
  }
)

describe(
  'Session token contract',
  () => {
    const sessionId =
      '8c411241-632b-49da-bbc1-83556284c9da'

    const secret =
      'a'.repeat(64)

    it(
      'accepts a valid session token',
      () => {
        expect(
          SessionTokenSchema
            .safeParse(
              `${sessionId}.${secret}`
            )
            .success
        ).toBe(true)
      }
    )

    it.each([
      'invalid',
      `${sessionId}.short`,
      `not-a-uuid.${secret}`,
      `${sessionId}.${secret}.extra`
    ])(
      'rejects malformed token %s',
      (token) => {
        expect(
          SessionTokenSchema
            .safeParse(token)
            .success
        ).toBe(false)
      }
    )
  }
)

describe(
  'PIN login response contract',
  () => {
    it(
      'accepts a valid authenticated session response',
      () => {
        const sessionId =
          '8c411241-632b-49da-bbc1-83556284c9da'

        const result =
          PinLoginResponseSchema
            .safeParse({
              sessionId,

              sessionToken:
                `${sessionId}.${'a'.repeat(64)}`,

              expiresAt:
                '2026-08-18T23:00:00.000Z',

              actor: {
                id:
                  'employee-01',

                displayName:
                  'Nguyễn Văn A',

                membershipId:
                  'membership-01',

                roleId:
                  'role-cashier',

                roleName:
                  'Thu ngân'
              }
            })

        expect(result.success)
          .toBe(true)
      }
    )
  }
)

describe(
  'Trusted AuthContext contract',
  () => {
    it(
      'accepts server-derived trusted actor context',
      () => {
        const result =
          AuthContextSchema
            .safeParse({
              sessionId:
                '8c411241-632b-49da-bbc1-83556284c9da',

              storeId:
                'store-01',

              deviceId:
                '36dd0037-fb9b-45ca-9b04-97a703abb336',

              actorId:
                'employee-01',

              membershipId:
                'membership-01',

              roleId:
                'role-cashier',

              pinCredentialVersion:
                1
            })

        expect(result.success)
          .toBe(true)
      }
    )

    it(
      'rejects invalid credential versions',
      () => {
        const result =
          AuthContextSchema
            .safeParse({
              sessionId:
                '8c411241-632b-49da-bbc1-83556284c9da',

              storeId:
                'store-01',

              deviceId:
                '36dd0037-fb9b-45ca-9b04-97a703abb336',

              actorId:
                'employee-01',

              membershipId:
                'membership-01',

              roleId:
                'role-cashier',

              pinCredentialVersion:
                0
            })

        expect(result.success)
          .toBe(false)
      }
    )
  }
)