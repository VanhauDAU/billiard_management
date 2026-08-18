import {
  env
} from 'cloudflare:workers'

import {
  describe,
  expect,
  it
} from 'vitest'

import {
  Hono
} from 'hono'

import {
  PERMISSION_KEYS
} from '@billiards/contracts'

import type {
  PermissionKey
} from '@billiards/contracts'

import {
  generateDeviceSecret,
  sha256Hex
} from '../src/security/device-credential'

import {
  derivePinHash,
  generatePinSalt
} from '../src/security/pin-credential'

import {
  createSessionCredential
} from '../src/security/session-credential'

import {
  requireDevice
} from '../src/middleware/require-device'

import {
  requireAuthSession
} from '../src/middleware/require-auth-session'

import {
  requirePermission
} from '../src/middleware/require-permission'

import type {
  AppEnv
} from '../src/types/app-env'


const TEST_PIN =
  '0012'

const TEST_PIN_ITERATIONS =
  1_000


type PermissionFixture = {
  storeId: string

  roleId: string

  userId: string

  membershipId: string

  deviceId: string
  deviceSecret: string

  sessionId: string
  sessionToken: string
}


const protectedApp =
  new Hono<AppEnv>()


protectedApp.use(
  '*',
  requireDevice
)

protectedApp.use(
  '*',
  requireAuthSession
)

protectedApp.get(
  '/protected',

  requirePermission(
    'table.view'
  ),

  (c) => {
    const context =
      c.get(
        'permissionContext'
      )

    return c.json({
      ok: true,

      actorId:
        context
          .authContext
          .actorId,

      permissions:
        Array.from(
          context.permissions
        ).sort()
    })
  }
)


async function createPermissionFixture(
  grantedPermissions:
    PermissionKey[] = []
): Promise<PermissionFixture> {
  const suffix =
    crypto.randomUUID()

  const storeId =
    `store-permission-${suffix}`

  const roleId =
    `role-permission-${suffix}`

  const userId =
    `user-permission-${suffix}`

  const membershipId =
    `membership-permission-${suffix}`

  const deviceId =
    crypto.randomUUID()

  const installationId =
    crypto.randomUUID()

  const deviceSecret =
    generateDeviceSecret()

  const deviceCredentialHash =
    await sha256Hex(
      deviceSecret
    )


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
      `Permission Store ${suffix}`,
      `permission-store-${suffix}`
    )
    .run()


  await env.DB
    .prepare(`
      INSERT INTO roles (
        id,
        store_id,
        code,
        name,
        status
      )

      VALUES (
        ?1,
        ?2,
        ?3,
        'Permission Test Role',
        'active'
      )
    `)
    .bind(
      roleId,
      storeId,
      `permission-role-${suffix}`
    )
    .run()


  await env.DB
    .prepare(`
      INSERT INTO users (
        id,
        store_id,
        username,
        username_normalized,
        display_name,
        status
      )

      VALUES (
        ?1,
        ?2,
        ?3,
        ?3,
        ?4,
        'active'
      )
    `)
    .bind(
      userId,
      storeId,
      `permission-user-${suffix}`,
      `Permission User ${suffix}`
    )
    .run()


  await env.DB
    .prepare(`
      INSERT INTO store_memberships (
        id,
        store_id,
        user_id,
        role_id,
        status
      )

      VALUES (
        ?1,
        ?2,
        ?3,
        ?4,
        'active'
      )
    `)
    .bind(
      membershipId,
      storeId,
      userId,
      roleId
    )
    .run()


  await env.DB
    .prepare(`
      INSERT INTO devices (
        id,
        store_id,
        installation_id,

        name,
        device_type,
        platform,
        status,

        credential_hash,
        credential_created_at,
        credential_version
      )

      VALUES (
        ?1,
        ?2,
        ?3,

        'Permission Test POS',
        'desktop_pos',
        'windows',
        'active',

        ?4,
        CURRENT_TIMESTAMP,
        1
      )
    `)
    .bind(
      deviceId,
      storeId,
      installationId,
      deviceCredentialHash
    )
    .run()


  const pinSalt =
    generatePinSalt()

  const pinHash =
    await derivePinHash(
      TEST_PIN,
      pinSalt,
      TEST_PIN_ITERATIONS
    )


  await env.DB
    .prepare(`
      INSERT INTO employee_pin_credentials (
        id,
        store_id,
        user_id,

        pin_hash,
        pin_salt,

        kdf_algorithm,
        kdf_iterations,

        credential_version,
        status
      )

      VALUES (
        ?1,
        ?2,
        ?3,

        ?4,
        ?5,

        'pbkdf2-sha256',
        ?6,

        1,
        'active'
      )
    `)
    .bind(
      crypto.randomUUID(),

      storeId,
      userId,

      pinHash,
      pinSalt,

      TEST_PIN_ITERATIONS
    )
    .run()


  for (
    const permission
    of grantedPermissions
  ) {
    await grantPermission(
      storeId,
      roleId,
      permission
    )
  }


  const sessionCredential =
    await createSessionCredential()


  const expiresAt =
    new Date(
      Date.now() +
        60 * 60 * 1000
    ).toISOString()


  await env.DB
    .prepare(`
      INSERT INTO auth_sessions (
        id,

        store_id,
        user_id,
        membership_id,
        device_id,

        session_token_hash,

        expires_at,

        pin_credential_version
      )

      VALUES (
        ?1,

        ?2,
        ?3,
        ?4,
        ?5,

        ?6,

        ?7,

        1
      )
    `)
    .bind(
      sessionCredential
        .sessionId,

      storeId,
      userId,
      membershipId,
      deviceId,

      sessionCredential
        .secretHash,

      expiresAt
    )
    .run()


  return {
    storeId,

    roleId,

    userId,

    membershipId,

    deviceId,
    deviceSecret,

    sessionId:
      sessionCredential
        .sessionId,

    sessionToken:
      sessionCredential
        .token
  }
}


async function grantPermission(
  storeId: string,
  roleId: string,
  permission:
    PermissionKey
): Promise<void> {
  await env.DB
    .prepare(`
      INSERT INTO role_permissions (
        store_id,
        role_id,
        permission_key
      )

      VALUES (
        ?1,
        ?2,
        ?3
      )
    `)
    .bind(
      storeId,
      roleId,
      permission
    )
    .run()
}


async function revokePermission(
  storeId: string,
  roleId: string,
  permission:
    PermissionKey
): Promise<void> {
  await env.DB
    .prepare(`
      DELETE FROM role_permissions

      WHERE
        store_id = ?1

        AND role_id = ?2

        AND permission_key = ?3
    `)
    .bind(
      storeId,
      roleId,
      permission
    )
    .run()
}


function authHeaders(
  fixture:
    PermissionFixture,

  extra:
    Record<
      string,
      string
    > = {}
): Headers {
  return new Headers({
    Authorization:
      [
        'Device ',
        fixture.deviceId,
        '.',
        fixture.deviceSecret
      ].join(''),

    'X-Auth-Session':
      fixture.sessionToken,

    ...extra
  })
}


async function requestProtected(
  fixture:
    PermissionFixture,

  extraHeaders:
    Record<
      string,
      string
    > = {}
): Promise<Response> {
  return protectedApp.request(
    '/protected',

    {
      headers:
        authHeaders(
          fixture,
          extraHeaders
        )
    },

    env
  )
}


async function createRole(
  storeId: string
): Promise<string> {
  const suffix =
    crypto.randomUUID()

  const roleId =
    `role-new-${suffix}`

  await env.DB
    .prepare(`
      INSERT INTO roles (
        id,
        store_id,
        code,
        name,
        status
      )

      VALUES (
        ?1,
        ?2,
        ?3,
        'New Permission Role',
        'active'
      )
    `)
    .bind(
      roleId,
      storeId,
      `new-role-${suffix}`
    )
    .run()

  return roleId
}


describe(
  'Permission context',
  () => {
    it(
      'keeps the TypeScript permission allowlist aligned with D1 permission_catalog',

      async () => {
        const result =
          await env.DB
            .prepare(`
              SELECT
                permission_key

              FROM permission_catalog

              ORDER BY
                permission_key
            `)
            .all<{
              permission_key:
                string
            }>()

        const databaseKeys =
          result.results
            .map(
              (row) =>
                row.permission_key
            )
            .sort()

        const contractKeys =
          [
            ...PERMISSION_KEYS
          ].sort()

        expect(
          databaseKeys
        ).toEqual(
          contractKeys
        )
      }
    )


    it(
      'allows an authenticated actor with table.view',

      async () => {
        const fixture =
          await createPermissionFixture([
            'table.view'
          ])

        const response =
          await requestProtected(
            fixture
          )

        expect(
          response.status
        ).toBe(200)

        expect(
          await response.json()
        ).toMatchObject({
          ok: true,

          actorId:
            fixture.userId,

          permissions: [
            'table.view'
          ]
        })
      }
    )


    it(
      'returns 403 when the authenticated actor lacks table.view',

      async () => {
        const fixture =
          await createPermissionFixture()

        const response =
          await requestProtected(
            fixture
          )

        expect(
          response.status
        ).toBe(403)

        expect(
          await response.json()
        ).toEqual({
          ok: false,
          error:
            'permission_denied'
        })
      }
    )


    it(
      'applies permission revocation on the next request',

      async () => {
        const fixture =
          await createPermissionFixture([
            'table.view'
          ])

        const before =
          await requestProtected(
            fixture
          )

        expect(
          before.status
        ).toBe(200)


        await revokePermission(
          fixture.storeId,
          fixture.roleId,
          'table.view'
        )


        const after =
          await requestProtected(
            fixture
          )

        expect(
          after.status
        ).toBe(403)
      }
    )


    it(
      'rejects a suspended membership on the next request',

      async () => {
        const fixture =
          await createPermissionFixture([
            'table.view'
          ])


        await env.DB
          .prepare(`
            UPDATE store_memberships

            SET
              status =
                'suspended',

              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?1

              AND id = ?2
          `)
          .bind(
            fixture.storeId,
            fixture.membershipId
          )
          .run()


        const response =
          await requestProtected(
            fixture
          )

        expect(
          response.status
        ).toBe(401)

        expect(
          await response.json()
        ).toMatchObject({
          ok: false,

          error:
            'invalid_auth_session'
        })
      }
    )


    it(
      'rejects a disabled role on the next request',

      async () => {
        const fixture =
          await createPermissionFixture([
            'table.view'
          ])


        await env.DB
          .prepare(`
            UPDATE roles

            SET
              status =
                'disabled',

              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?1

              AND id = ?2
          `)
          .bind(
            fixture.storeId,
            fixture.roleId
          )
          .run()


        const response =
          await requestProtected(
            fixture
          )

        expect(
          response.status
        ).toBe(401)
      }
    )


    it(
      'uses a newly assigned role on the next request without issuing a new session',

      async () => {
        const fixture =
          await createPermissionFixture()


        const before =
          await requestProtected(
            fixture
          )

        expect(
          before.status
        ).toBe(403)


        const newRoleId =
          await createRole(
            fixture.storeId
          )


        await grantPermission(
          fixture.storeId,
          newRoleId,
          'table.view'
        )


        await env.DB
          .prepare(`
            UPDATE store_memberships

            SET
              role_id = ?1,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?2

              AND id = ?3
          `)
          .bind(
            newRoleId,
            fixture.storeId,
            fixture.membershipId
          )
          .run()


        const after =
          await requestProtected(
            fixture
          )

        expect(
          after.status
        ).toBe(200)
      }
    )


    it(
      'does not accept client supplied permission or role metadata',

      async () => {
        const fixture =
          await createPermissionFixture()


        const response =
          await requestProtected(
            fixture,

            {
              'X-Permission':
                'table.view',

              'X-Role-Id':
                'attacker-role',

              'X-Actor-Id':
                'attacker'
            }
          )


        expect(
          response.status
        ).toBe(403)

        expect(
          await response.json()
        ).toEqual({
          ok: false,

          error:
            'permission_denied'
        })
      }
    )


    it(
      'does not inherit permissions from another Store',

      async () => {
        const fixtureA =
          await createPermissionFixture()

        const fixtureB =
          await createPermissionFixture([
            'table.view'
          ])


        /*
         * Store B having table.view must
         * have no effect on Store A.
         */
        expect(
          fixtureA.storeId
        ).not.toBe(
          fixtureB.storeId
        )


        const response =
          await requestProtected(
            fixtureA
          )


        expect(
          response.status
        ).toBe(403)
      }
    )
  }
)