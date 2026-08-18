import {
  exports
} from 'cloudflare:workers'

import {
  describe,
  expect,
  it
} from 'vitest'

const SYSTEM_TOKEN =
  'test-system-diagnostics-token-0123456789abcdef'

const DB_HEALTH_URL =
  'https://example.test/api/system/db-health'

describe(
  'System diagnostics authentication',
  () => {
    it(
      'rejects a request without the system token',
      async () => {
        const response =
          await exports.default.fetch(
            new Request(
              DB_HEALTH_URL
            )
          )

        expect(response.status)
          .toBe(401)
      }
    )

    it(
      'rejects an invalid system token',
      async () => {
        const response =
          await exports.default.fetch(
            new Request(
              DB_HEALTH_URL,
              {
                headers: {
                  Authorization:
                    'Bearer wrong-system-diagnostics-token-0123456789'
                }
              }
            )
          )

        expect(response.status)
          .toBe(401)
      }
    )

    it(
      'allows an authenticated D1 diagnostic request',
      async () => {
        const response =
          await exports.default.fetch(
            new Request(
              DB_HEALTH_URL,
              {
                headers: {
                  Authorization:
                    `Bearer ${SYSTEM_TOKEN}`
                }
              }
            )
          )

        expect(response.status)
          .toBe(200)

        const body =
          await response.json<{
            ok: boolean
            database: string
          }>()

        expect(body)
          .toMatchObject({
            ok: true,
            database: 'd1'
          })
      }
    )
  }
)
