import {
  describe,
  expect,
  it
} from 'vitest'

import {
  createPinHash,
  derivePinHash,
  generatePinSalt,
  isValidEmployeePin,
  PIN_KDF_ALGORITHM,
  PIN_KDF_ITERATIONS,
  verifyPin
} from '../src/security/pin-credential'

const TEST_ITERATIONS = 1_000

describe(
  'Employee PIN validation',
  () => {
    it.each([
      '0000',
      '0012',
      '1234',
      '12345',
      '123456'
    ])(
      'accepts valid numeric PIN %s',
      (pin) => {
        expect(
          isValidEmployeePin(pin)
        ).toBe(true)
      }
    )

    it.each([
      '',
      '123',
      '1234567',
      'abcd',
      '12ab',
      '12 34',
      ' 1234',
      '1234 ',
      '+1234',
      '12.34'
    ])(
      'rejects invalid PIN %s',
      (pin) => {
        expect(
          isValidEmployeePin(pin)
        ).toBe(false)
      }
    )

    it(
      'preserves leading zeroes',
      () => {
        expect(
          isValidEmployeePin('0012')
        ).toBe(true)

        expect(
          isValidEmployeePin('12')
        ).toBe(false)
      }
    )
  }
)

describe(
  'Employee PIN salt',
  () => {
    it(
      'generates a 16-byte hexadecimal salt',
      () => {
        const salt =
          generatePinSalt()

        expect(salt)
          .toMatch(/^[a-f0-9]{32}$/)

        expect(salt)
          .toHaveLength(32)
      }
    )

    it(
      'generates different random salts',
      () => {
        const first =
          generatePinSalt()

        const second =
          generatePinSalt()

        expect(first)
          .not
          .toBe(second)
      }
    )
  }
)

describe(
  'Employee PIN PBKDF2',
  () => {
    it(
      'derives the same hash for the same PIN, salt, and iterations',
      async () => {
        const salt =
          generatePinSalt()

        const first =
          await derivePinHash(
            '123456',
            salt,
            TEST_ITERATIONS
          )

        const second =
          await derivePinHash(
            '123456',
            salt,
            TEST_ITERATIONS
          )

        expect(first)
          .toBe(second)

        expect(first)
          .toMatch(/^[a-f0-9]{64}$/)
      }
    )

    it(
      'derives different hashes for the same PIN with different salts',
      async () => {
        const firstSalt =
          generatePinSalt()

        const secondSalt =
          generatePinSalt()

        const firstHash =
          await derivePinHash(
            '123456',
            firstSalt,
            TEST_ITERATIONS
          )

        const secondHash =
          await derivePinHash(
            '123456',
            secondSalt,
            TEST_ITERATIONS
          )

        expect(firstHash)
          .not
          .toBe(secondHash)
      }
    )

    it(
      'derives different hashes for different PINs with the same salt',
      async () => {
        const salt =
          generatePinSalt()

        const firstHash =
          await derivePinHash(
            '123456',
            salt,
            TEST_ITERATIONS
          )

        const secondHash =
          await derivePinHash(
            '654321',
            salt,
            TEST_ITERATIONS
          )

        expect(firstHash)
          .not
          .toBe(secondHash)
      }
    )

    it(
      'verifies the correct PIN',
      async () => {
        const salt =
          generatePinSalt()

        const hash =
          await derivePinHash(
            '0012',
            salt,
            TEST_ITERATIONS
          )

        const result =
          await verifyPin(
            '0012',
            salt,
            hash,
            TEST_ITERATIONS
          )

        expect(result)
          .toBe(true)
      }
    )

    it(
      'rejects an incorrect PIN',
      async () => {
        const salt =
          generatePinSalt()

        const hash =
          await derivePinHash(
            '123456',
            salt,
            TEST_ITERATIONS
          )

        const result =
          await verifyPin(
            '654321',
            salt,
            hash,
            TEST_ITERATIONS
          )

        expect(result)
          .toBe(false)
      }
    )

    it(
      'rejects a malformed PIN before verification',
      async () => {
        const salt =
          generatePinSalt()

        const hash =
          await derivePinHash(
            '123456',
            salt,
            TEST_ITERATIONS
          )

        await expect(
          verifyPin(
            '123',
            salt,
            hash,
            TEST_ITERATIONS
          )
        ).resolves.toBe(false)
      }
    )
  }
)

describe(
  'Employee PIN production credential',
  () => {
    it(
      'creates credential metadata using the configured production KDF',
      async () => {
        const credential =
          await createPinHash(
            '123456'
          )

        expect(
          credential.algorithm
        ).toBe(
          PIN_KDF_ALGORITHM
        )

        expect(
          credential.iterations
        ).toBe(
          PIN_KDF_ITERATIONS
        )

        expect(
          credential.salt
        ).toMatch(
          /^[a-f0-9]{32}$/
        )

        expect(
          credential.hash
        ).toMatch(
          /^[a-f0-9]{64}$/
        )

        expect(
          credential.hash
        ).not.toContain(
          '123456'
        )
      }
    )
  }
)