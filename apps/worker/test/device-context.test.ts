import {
  env,
  exports
} from 'cloudflare:workers'

import {
  describe,
  expect,
  it
} from 'vitest'

import {
  sha256Hex
} from '../src/security/device-credential'
function generateTestToken(): string {
  return [
    crypto.randomUUID(),
    crypto.randomUUID()
  ].join('').replaceAll('-', '')
}

async function createStore(
  storeId: string
): Promise<void> {
  await env.DB
    .prepare(`
      INSERT INTO stores (
        id,
        name,
        slug,
        status
      )

      VALUES (
        ?1,
        ?2,
        ?3,
        'active'
      )
    `)
    .bind(
      storeId,
      `Store ${storeId}`,
      `store-${storeId}`
    )
    .run()
}
async function createActivationToken(
  storeId: string,
  token: string
): Promise<void> {
  const hash =
    await sha256Hex(token)

  await env.DB
    .prepare(`
      INSERT INTO device_activation_tokens (
        id,
        store_id,
        token_hash,
        status,
        expires_at
      )

      VALUES (
        ?1,
        ?2,
        ?3,
        'active',
        datetime(
          'now',
          '+1 hour'
        )
      )
    `)
    .bind(
      crypto.randomUUID(),
      storeId,
      hash
    )
    .run()
}
async function createExpiredActivationToken(
  storeId: string,
  token: string
): Promise<void> {
  const hash =
    await sha256Hex(token)

  await env.DB
    .prepare(`
      INSERT INTO device_activation_tokens (
        id,
        store_id,
        token_hash,
        status,
        expires_at
      )

      VALUES (
        ?1,
        ?2,
        ?3,
        'active',
        datetime(
          'now',
          '-1 hour'
        )
      )
    `)
    .bind(
      crypto.randomUUID(),
      storeId,
      hash
    )
    .run()
}
async function activateTestDevice(
  storeId: string
) {
  const token =
    generateTestToken()

  await createStore(storeId)

  await createActivationToken(
    storeId,
    token
  )

  const response =
    await exports.default.fetch(
      new Request(
        'https://example.test/api/devices/activate',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            activationToken: token,

            installationId:
              crypto.randomUUID(),

            name:
              'Test POS',

            deviceType:
              'desktop_pos',

            platform:
              'windows',

            appVersion:
              '0.0.0'
          })
        }
      )
    )

  expect(response.status)
    .toBe(201)

  return response.json<{
    deviceId: string
    deviceSecret: string
    storeId: string
  }>()
}
describe('Device context', () => {

it(
  'resolves trusted Store from device credential',
  async () => {
    const activation =
      await activateTestDevice(
        'context-store-a'
      )

    const response =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/pos/context',
          {
            headers: {
              Authorization:
                `Device ${activation.deviceId}.${activation.deviceSecret}`,

              // cố tình giả mạo
              'x-store-id':
                'context-store-b'
            }
          }
        )
      )

    expect(response.status)
      .toBe(200)

    const body =
      await response.json<{
        store: {
          id: string
        }
      }>()

    expect(body.store.id)
      .toBe('context-store-a')
  }
)
it(
  'never stores raw device secret in D1',
  async () => {
    const activation =
      await activateTestDevice(
        'secret-store'
      )

    const row = await env.DB
      .prepare(`
        SELECT credential_hash

        FROM devices

        WHERE id = ?1
      `)
      .bind(
        activation.deviceId
      )
      .first<{
        credential_hash: string
      }>()

    expect(row)
      .not.toBeNull()

    expect(
      row!.credential_hash
    ).not.toBe(
      activation.deviceSecret
    )

    expect(
      row!.credential_hash
    ).toBe(
      await sha256Hex(
        activation.deviceSecret
      )
    )
  }
)
it(
  'rejects a revoked device',
  async () => {
    const activation =
      await activateTestDevice(
        'revoked-store'
      )

    await env.DB
      .prepare(`
        UPDATE devices

        SET
          status = 'revoked',
          revoked_at =
            CURRENT_TIMESTAMP

        WHERE id = ?1
      `)
      .bind(
        activation.deviceId
      )
      .run()

    const response =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/pos/context',
          {
            headers: {
              Authorization:
                `Device ${activation.deviceId}.${activation.deviceSecret}`
            }
          }
        )
      )

    expect(response.status)
      .toBe(403)
  }
)
it(
  'rotates credential when reactivating the same installation',
  async () => {
    const storeId =
      'reactivation-store'

    const installationId =
      crypto.randomUUID()

    const firstToken =
      generateTestToken()

    await createStore(storeId)

    await createActivationToken(
      storeId,
      firstToken
    )

    async function activate(
      activationToken: string
    ) {
      return exports.default.fetch(
        new Request(
          'https://example.test/api/devices/activate',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              activationToken,

              installationId,

              name:
                'POS Reactivation',

              deviceType:
                'desktop_pos',

              platform:
                'windows',

              appVersion:
                '0.0.0'
            })
          }
        )
      )
    }

    const firstResponse =
      await activate(
        firstToken
      )

    expect(
      firstResponse.status
    ).toBe(201)

    const first =
      await firstResponse.json<{
        deviceId: string
        deviceSecret: string
      }>()

    const secondToken =
      generateTestToken()

    await createActivationToken(
      storeId,
      secondToken
    )

    const secondResponse =
      await activate(
        secondToken
      )

    expect(
      secondResponse.status
    ).toBe(201)

    const second =
      await secondResponse.json<{
        deviceId: string
        deviceSecret: string
      }>()

    // Cùng installation => vẫn cùng device.
    expect(
      second.deviceId
    ).toBe(
      first.deviceId
    )

    // Nhưng secret phải được rotate.
    expect(
      second.deviceSecret
    ).not.toBe(
      first.deviceSecret
    )

    // Credential cũ không còn dùng được.
    const oldCredentialResponse =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/pos/context',
          {
            headers: {
              Authorization:
                `Device ${first.deviceId}.${first.deviceSecret}`
            }
          }
        )
      )

    expect(
      oldCredentialResponse.status
    ).toBe(401)

    // Credential mới hoạt động.
    const newCredentialResponse =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/pos/context',
          {
            headers: {
              Authorization:
                `Device ${second.deviceId}.${second.deviceSecret}`
            }
          }
        )
      )

    expect(
      newCredentialResponse.status
    ).toBe(200)

    const row =
      await env.DB
        .prepare(`
          SELECT
            credential_version

          FROM devices

          WHERE id = ?1
        `)
        .bind(
          second.deviceId
        )
        .first<{
          credential_version: number
        }>()

    expect(row)
      .not.toBeNull()

    expect(
      row!.credential_version
    ).toBe(2)
  }
)
it(
  'consumes an activation token only once',
  async () => {
    const storeId =
      'one-time-token-store'

    const token =
      generateTestToken()

    await createStore(storeId)

    await createActivationToken(
      storeId,
      token
    )

    const createRequestBody = () => ({
      activationToken: token,

      installationId:
        crypto.randomUUID(),

      name:
        'Test POS',

      deviceType:
        'desktop_pos',

      platform:
        'windows',

      appVersion:
        '0.0.0'
    })

    const firstResponse =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/devices/activate',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify(
              createRequestBody()
            )
          }
        )
      )

    expect(firstResponse.status)
      .toBe(201)

    const secondResponse =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/devices/activate',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify(
              createRequestBody()
            )
          }
        )
      )

    expect(secondResponse.status)
      .toBe(401)

    const body =
      await secondResponse.json<{
        error: string
      }>()

    expect(body.error)
      .toBe(
        'invalid_activation_token'
      )
  }
)
it(
  'rejects a request without device credentials',
  async () => {
    const response =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/pos/context'
        )
      )

    expect(response.status)
      .toBe(401)

    const body =
      await response.json<{
        error: string
      }>()

    expect(body.error)
      .toBe(
        'device_auth_required'
      )
  }
)
it(
  'rejects an invalid device secret',
  async () => {
    const activation =
      await activateTestDevice(
        'invalid-secret-store'
      )

    const wrongSecret =
      'f'.repeat(64)

    const response =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/pos/context',
          {
            headers: {
              Authorization:
                `Device ${activation.deviceId}.${wrongSecret}`
            }
          }
        )
      )

    expect(response.status)
      .toBe(401)

    const body =
      await response.json<{
        error: string
      }>()

    expect(body.error)
      .toBe(
        'invalid_device_credential'
      )
  }
)
it(
  'rejects a device when its Store is suspended',
  async () => {
    const activation =
      await activateTestDevice(
        'suspended-store'
      )

    await env.DB
      .prepare(`
        UPDATE stores

        SET status = 'suspended'

        WHERE id = ?1
      `)
      .bind(
        activation.storeId
      )
      .run()

    const response =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/pos/context',
          {
            headers: {
              Authorization:
                `Device ${activation.deviceId}.${activation.deviceSecret}`
            }
          }
        )
      )

    expect(response.status)
      .toBe(403)

    const body =
      await response.json<{
        error: string
      }>()

    expect(body.error)
      .toBe(
        'store_inactive'
      )
  }
)
it(
  'rejects an expired activation token',
  async () => {
    const storeId =
      'expired-token-store'

    const token =
      generateTestToken()

    await createStore(storeId)

    await createExpiredActivationToken(
      storeId,
      token
    )

    const response =
      await exports.default.fetch(
        new Request(
          'https://example.test/api/devices/activate',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              activationToken: token,

              installationId:
                crypto.randomUUID(),

              name:
                'Expired POS',

              deviceType:
                'desktop_pos',

              platform:
                'windows',

              appVersion:
                '0.0.0'
            })
          }
        )
      )

    expect(response.status)
      .toBe(401)
  }
)
})
