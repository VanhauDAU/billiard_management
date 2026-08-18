import {
  describe,
  expect,
  it
} from 'vitest'

import {
  createSessionCredential,
  generateSessionSecret,
  hashSessionSecret,
  parseSessionToken,
  verifySessionSecret
} from '../src/security/session-credential'

describe(
  'Session secret generation',
  () => {
    it(
      'generates a 32-byte hexadecimal secret',
      () => {
        const secret =
          generateSessionSecret()

        expect(secret)
          .toMatch(
            /^[a-f0-9]{64}$/
          )

        expect(secret)
          .toHaveLength(64)
      }
    )

    it(
      'generates different secrets',
      () => {
        const first =
          generateSessionSecret()

        const second =
          generateSessionSecret()

        expect(first)
          .not
          .toBe(second)
      }
    )
  }
)

describe(
  'Session token parser',
  () => {
    const sessionId =
      '8c411241-632b-49da-bbc1-83556284c9da'

    const secret =
      'a'.repeat(64)

    it(
      'parses a valid session token',
      () => {
        expect(
          parseSessionToken(
            `${sessionId}.${secret}`
          )
        ).toEqual({
          sessionId,
          secret
        })
      }
    )

    it(
      'rejects a missing token',
      () => {
        expect(
          parseSessionToken(
            undefined
          )
        ).toBeNull()
      }
    )

    it(
      'rejects an invalid session id',
      () => {
        expect(
          parseSessionToken(
            `not-a-uuid.${secret}`
          )
        ).toBeNull()
      }
    )

    it(
      'rejects a short secret',
      () => {
        expect(
          parseSessionToken(
            `${sessionId}.short`
          )
        ).toBeNull()
      }
    )

    it(
      'rejects extra separators',
      () => {
        expect(
          parseSessionToken(
            `${sessionId}.${secret}.extra`
          )
        ).toBeNull()
      }
    )

    it(
      'rejects a missing separator',
      () => {
        expect(
          parseSessionToken(
            `${sessionId}${secret}`
          )
        ).toBeNull()
      }
    )
  }
)

describe(
  'Session secret hashing',
  () => {
    it(
      'produces a SHA-256 hexadecimal hash',
      async () => {
        const secret =
          generateSessionSecret()

        const hash =
          await hashSessionSecret(
            secret
          )

        expect(hash)
          .toMatch(
            /^[a-f0-9]{64}$/
          )

        expect(hash)
          .toHaveLength(64)

        expect(hash)
          .not
          .toBe(secret)
      }
    )

    it(
      'produces the same hash for the same secret',
      async () => {
        const secret =
          generateSessionSecret()

        const first =
          await hashSessionSecret(
            secret
          )

        const second =
          await hashSessionSecret(
            secret
          )

        expect(first)
          .toBe(second)
      }
    )

    it(
      'produces different hashes for different secrets',
      async () => {
        const firstSecret =
          generateSessionSecret()

        const secondSecret =
          generateSessionSecret()

        const firstHash =
          await hashSessionSecret(
            firstSecret
          )

        const secondHash =
          await hashSessionSecret(
            secondSecret
          )

        expect(firstHash)
          .not
          .toBe(secondHash)
      }
    )
  }
)

describe(
  'Session secret verification',
  () => {
    it(
      'accepts the correct secret',
      async () => {
        const secret =
          generateSessionSecret()

        const hash =
          await hashSessionSecret(
            secret
          )

        await expect(
          verifySessionSecret(
            secret,
            hash
          )
        ).resolves.toBe(true)
      }
    )

    it(
      'rejects an incorrect secret',
      async () => {
        const correctSecret =
          generateSessionSecret()

        const wrongSecret =
          generateSessionSecret()

        const hash =
          await hashSessionSecret(
            correctSecret
          )

        await expect(
          verifySessionSecret(
            wrongSecret,
            hash
          )
        ).resolves.toBe(false)
      }
    )

    it(
      'rejects malformed secrets',
      async () => {
        await expect(
          verifySessionSecret(
            'short',
            'a'.repeat(64)
          )
        ).resolves.toBe(false)
      }
    )

    it(
      'rejects malformed stored hashes',
      async () => {
        const secret =
          generateSessionSecret()

        await expect(
          verifySessionSecret(
            secret,
            'invalid-hash'
          )
        ).resolves.toBe(false)
      }
    )
  }
)

describe(
  'Session credential creation',
  () => {
    it(
      'creates a parseable session token',
      async () => {
        const credential =
          await createSessionCredential()

        const parsed =
          parseSessionToken(
            credential.token
          )

        expect(parsed)
          .toEqual({
            sessionId:
              credential.sessionId,

            secret:
              credential.secret
          })
      }
    )

    it(
      'returns only the hash intended for persistence',
      async () => {
        const credential =
          await createSessionCredential()

        expect(
          credential.secretHash
        ).not.toBe(
          credential.secret
        )

        await expect(
          verifySessionSecret(
            credential.secret,
            credential.secretHash
          )
        ).resolves.toBe(true)
      }
    )

    it(
      'creates unique credentials',
      async () => {
        const first =
          await createSessionCredential()

        const second =
          await createSessionCredential()

        expect(
          first.sessionId
        ).not.toBe(
          second.sessionId
        )

        expect(
          first.secret
        ).not.toBe(
          second.secret
        )

        expect(
          first.token
        ).not.toBe(
          second.token
        )
      }
    )
  }
)