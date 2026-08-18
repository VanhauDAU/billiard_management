import {
  env,
  exports
} from 'cloudflare:workers'

import {
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
        datetime('now', '+1 hour')
      )
    `)
    .bind(
      crypto.randomUUID(),
      storeId,
      hash
    )
    .run()
}

async function activate(
  token: string,
  installationId: string,
  name: string
): Promise<Response> {
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
          activationToken: token,
          installationId,
          name,
          deviceType:
            'desktop_pos',
          platform: 'windows',
          appVersion: '0.0.0'
        })
      }
    )
  )
}

it(
  'rejects activating the same installation for a different Store',
  async () => {
    const installationId =
      crypto.randomUUID()

    const firstStore =
      'cross-store-device-a'

    const secondStore =
      'cross-store-device-b'

    const firstToken =
      generateTestToken()

    const secondToken =
      generateTestToken()

    await createStore(firstStore)
    await createStore(secondStore)

    await createActivationToken(
      firstStore,
      firstToken
    )

    await createActivationToken(
      secondStore,
      secondToken
    )

    const firstResponse =
      await activate(
        firstToken,
        installationId,
        'POS Store A'
      )

    expect(firstResponse.status)
      .toBe(201)

    const first =
      await firstResponse.json<{
        deviceId: string
        deviceSecret: string
      }>()

    const secondResponse =
      await activate(
        secondToken,
        installationId,
        'POS Store B'
      )

    expect(secondResponse.status)
      .toBe(409)

    const originalCredential =
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

    expect(originalCredential.status)
      .toBe(200)

    const secondTokenHash =
      await sha256Hex(
        secondToken
      )

    const secondTokenRow =
      await env.DB
        .prepare(`
          SELECT status
          FROM device_activation_tokens
          WHERE token_hash = ?1
        `)
        .bind(secondTokenHash)
        .first<{
          status: string
        }>()

    expect(secondTokenRow?.status)
      .toBe('active')

    const rows = await env.DB
      .prepare(`
        SELECT store_id
        FROM devices
        WHERE installation_id = ?1
      `)
      .bind(installationId)
      .all<{
        store_id: string
      }>()

    expect(rows.results)
      .toEqual([
        {
          store_id: firstStore
        }
      ])
  }
)
