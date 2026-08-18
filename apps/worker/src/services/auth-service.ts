import type {
  AuthContext,
  AuthSessionResponse,
  DeviceContext,
  EmployeeListResponse,
  PinLoginRequest,
  PinLoginResponse
} from '@billiards/contracts'

import {
  PIN_KDF_ALGORITHM,
  verifyPin
} from '../security/pin-credential'

import {
  createSessionCredential,
  parseSessionToken,
  verifySessionSecret
} from '../security/session-credential'

const AUTH_SESSION_TTL_MS =
  12 * 60 * 60 * 1000

const PIN_FAILURE_WINDOW_MINUTES =
  15

type EmployeeListRow = {
  id: string
  display_name: string
  role_name: string
  has_pin: number
}

type EmployeeLoginRow = {
  user_id: string
  display_name: string

  membership_id: string

  role_id: string
  role_name: string

  pin_hash: string | null
  pin_salt: string | null

  kdf_algorithm: string | null
  kdf_iterations: number | null

  pin_credential_version:
    number | null

  pin_status: string | null
}

type PinAuthStateRow = {
  failed_attempts: number
  locked_until: string | null
  retry_after_seconds: number
}

type SessionAuthRow = {
  session_id: string
  session_token_hash: string

  expires_at: string

  store_id: string
  device_id: string

  user_id: string
  display_name: string

  membership_id: string

  role_id: string
  role_name: string

  pin_credential_version: number
}
export async function listEmployeesForDevice(
  db: D1Database,
  deviceContext: DeviceContext
): Promise<EmployeeListResponse> {
  const result = await db
    .prepare(`
      SELECT
        u.id,
        u.display_name,
        r.name AS role_name,

        CASE
          WHEN pin.id IS NOT NULL
            AND pin.status = 'active'
          THEN 1
          ELSE 0
        END AS has_pin

      FROM users u

      INNER JOIN store_memberships m
        ON m.store_id = u.store_id
        AND m.user_id = u.id

      INNER JOIN roles r
        ON r.store_id = m.store_id
        AND r.id = m.role_id

      LEFT JOIN employee_pin_credentials pin
        ON pin.store_id = u.store_id
        AND pin.user_id = u.id

      WHERE
        u.store_id = ?1
        AND u.status = 'active'
        AND m.status = 'active'
        AND r.status = 'active'

      ORDER BY
        u.display_name COLLATE NOCASE ASC
    `)
    .bind(
      deviceContext.store.id
    )
    .all<EmployeeListRow>()

  return {
    employees:
      result.results.map(
        (row) => ({
          id: row.id,

          displayName:
            row.display_name,

          roleName:
            row.role_name,

          hasPin:
            row.has_pin === 1
        })
      )
  }
}
async function findEmployeeForLogin(
  db: D1Database,
  deviceContext: DeviceContext,
  employeeId: string
): Promise<EmployeeLoginRow | null> {
  return db
    .prepare(`
      SELECT
        u.id AS user_id,
        u.display_name,

        m.id AS membership_id,

        r.id AS role_id,
        r.name AS role_name,

        pin.pin_hash,
        pin.pin_salt,
        pin.kdf_algorithm,
        pin.kdf_iterations,

        pin.credential_version
          AS pin_credential_version,

        pin.status AS pin_status

      FROM users u

      INNER JOIN store_memberships m
        ON m.store_id = u.store_id
        AND m.user_id = u.id

      INNER JOIN roles r
        ON r.store_id = m.store_id
        AND r.id = m.role_id

      LEFT JOIN employee_pin_credentials pin
        ON pin.store_id = u.store_id
        AND pin.user_id = u.id

      WHERE
        u.store_id = ?1
        AND u.id = ?2

        AND u.status = 'active'
        AND m.status = 'active'
        AND r.status = 'active'

      LIMIT 1
    `)
    .bind(
      deviceContext.store.id,
      employeeId
    )
    .first<EmployeeLoginRow>()
}
async function getPinAuthState(
  db: D1Database,
  deviceContext: DeviceContext,
  employeeId: string
): Promise<PinAuthStateRow | null> {
  return db
    .prepare(`
      SELECT
        failed_attempts,
        locked_until,

        CASE
          WHEN
            locked_until IS NOT NULL
            AND unixepoch(locked_until)
              > unixepoch('now')
          THEN CAST(
            unixepoch(locked_until)
              - unixepoch('now')
            AS INTEGER
          )
          ELSE 0
        END AS retry_after_seconds

      FROM employee_pin_auth_state

      WHERE
        store_id = ?1
        AND user_id = ?2
        AND device_id = ?3

      LIMIT 1
    `)
    .bind(
      deviceContext.store.id,
      employeeId,
      deviceContext.device.id
    )
    .first<PinAuthStateRow>()
}
async function recordPinFailure(
  db: D1Database,
  deviceContext: DeviceContext,
  employeeId: string
): Promise<PinAuthStateRow> {
  await db
    .prepare(`
      INSERT INTO employee_pin_auth_state (
        store_id,
        user_id,
        device_id,

        failed_attempts,

        failure_window_started_at,
        last_failed_at,
        locked_until,

        updated_at
      )

      VALUES (
        ?1,
        ?2,
        ?3,

        1,

        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        NULL,

        CURRENT_TIMESTAMP
      )

      ON CONFLICT(
        store_id,
        user_id,
        device_id
      )

      DO UPDATE SET

        failed_attempts =
          CASE
            WHEN
              employee_pin_auth_state
                .failure_window_started_at
                IS NULL

              OR unixepoch(
                employee_pin_auth_state
                  .failure_window_started_at
              ) <= unixepoch(
                'now',
                '-${PIN_FAILURE_WINDOW_MINUTES} minutes'
              )

            THEN 1

            ELSE
              employee_pin_auth_state
                .failed_attempts + 1
          END,

        failure_window_started_at =
          CASE
            WHEN
              employee_pin_auth_state
                .failure_window_started_at
                IS NULL

              OR unixepoch(
                employee_pin_auth_state
                  .failure_window_started_at
              ) <= unixepoch(
                'now',
                '-${PIN_FAILURE_WINDOW_MINUTES} minutes'
              )

            THEN CURRENT_TIMESTAMP

            ELSE
              employee_pin_auth_state
                .failure_window_started_at
          END,

        last_failed_at =
          CURRENT_TIMESTAMP,

        locked_until =
          CASE

            -- Old failure window expired.
            WHEN
              employee_pin_auth_state
                .failure_window_started_at
                IS NULL

              OR unixepoch(
                employee_pin_auth_state
                  .failure_window_started_at
              ) <= unixepoch(
                'now',
                '-${PIN_FAILURE_WINDOW_MINUTES} minutes'
              )

            THEN NULL

            -- Attempt 5
            WHEN
              employee_pin_auth_state
                .failed_attempts + 1 = 5

            THEN datetime(
              'now',
              '+30 seconds'
            )

            -- Attempt 6
            WHEN
              employee_pin_auth_state
                .failed_attempts + 1 = 6

            THEN datetime(
              'now',
              '+1 minute'
            )

            -- Attempt 7
            WHEN
              employee_pin_auth_state
                .failed_attempts + 1 = 7

            THEN datetime(
              'now',
              '+5 minutes'
            )

            -- Attempt 8
            WHEN
              employee_pin_auth_state
                .failed_attempts + 1 = 8

            THEN datetime(
              'now',
              '+15 minutes'
            )

            -- Attempt 9+
            WHEN
              employee_pin_auth_state
                .failed_attempts + 1 >= 9

            THEN datetime(
              'now',
              '+30 minutes'
            )

            ELSE NULL
          END,

        updated_at =
          CURRENT_TIMESTAMP
    `)
    .bind(
      deviceContext.store.id,
      employeeId,
      deviceContext.device.id
    )
    .run()

  const state =
    await getPinAuthState(
      db,
      deviceContext,
      employeeId
    )

  if (!state) {
    throw new Error(
      'PIN auth state invariant failed'
    )
  }

  return state
}
async function clearPinFailures(
  db: D1Database,
  deviceContext: DeviceContext,
  employeeId: string
): Promise<void> {
  await db
    .prepare(`
      DELETE FROM employee_pin_auth_state

      WHERE
        store_id = ?1
        AND user_id = ?2
        AND device_id = ?3
    `)
    .bind(
      deviceContext.store.id,
      employeeId,
      deviceContext.device.id
    )
    .run()
}
export type EmployeePinLoginResult =
  | {
      ok: true
      value: PinLoginResponse
    }
  | {
      ok: false

      error:
        | 'employee_not_available'
        | 'pin_not_configured'
        | 'invalid_pin'
        | 'pin_locked'
        | 'authentication_unavailable'

      retryAfterSeconds?: number
    }
export async function authenticateEmployeePin(
  db: D1Database,
  deviceContext: DeviceContext,
  input: PinLoginRequest
): Promise<EmployeePinLoginResult> {
  const employee =
    await findEmployeeForLogin(
      db,
      deviceContext,
      input.employeeId
    )

  if (!employee) {
    return {
      ok: false,
      error:
        'employee_not_available'
    }
  }

  if (
    !employee.pin_hash ||
    !employee.pin_salt ||
    !employee.kdf_algorithm ||
    employee.kdf_iterations === null ||
    employee.pin_credential_version === null ||
    employee.pin_status !== 'active'
  ) {
    return {
      ok: false,
      error:
        'pin_not_configured'
    }
  }

  if (
    employee.kdf_algorithm !==
      PIN_KDF_ALGORITHM
  ) {
    console.error(
      'Unsupported PIN KDF algorithm:',
      employee.kdf_algorithm
    )

    return {
      ok: false,
      error:
        'authentication_unavailable'
    }
  }

  const authState =
    await getPinAuthState(
      db,
      deviceContext,
      employee.user_id
    )

  if (
    authState &&
    authState.retry_after_seconds > 0
  ) {
    return {
      ok: false,
      error: 'pin_locked',

      retryAfterSeconds:
        authState.retry_after_seconds
    }
  }

  const pinIsValid =
    await verifyPin(
      input.pin,
      employee.pin_salt,
      employee.pin_hash,
      employee.kdf_iterations
    )

  if (!pinIsValid) {
    const failure =
      await recordPinFailure(
        db,
        deviceContext,
        employee.user_id
      )

    if (
      failure.retry_after_seconds > 0
    ) {
      return {
        ok: false,
        error: 'pin_locked',

        retryAfterSeconds:
          failure.retry_after_seconds
      }
    }

    return {
      ok: false,
      error: 'invalid_pin'
    }
  }

  const credential =
    await createSessionCredential()

  const expiresAt =
    new Date(
      Date.now() +
        AUTH_SESSION_TTL_MS
    ).toISOString()

  try {
    const insert =
      await db
        .prepare(`
          INSERT INTO auth_sessions (
            id,

            store_id,
            user_id,
            membership_id,
            device_id,

            session_token_hash,

            expires_at,

            last_seen_at,
            revoked_at,

            created_at,

            pin_credential_version,
            revocation_reason
          )

          SELECT
            ?1,

            u.store_id,
            u.id,
            m.id,
            d.id,

            ?2,

            ?3,

            NULL,
            NULL,

            CURRENT_TIMESTAMP,

            ?4,
            NULL

          FROM users u

          INNER JOIN stores s
            ON s.id = u.store_id

          INNER JOIN store_memberships m
            ON m.store_id = u.store_id
            AND m.user_id = u.id

          INNER JOIN roles r
            ON r.store_id = m.store_id
            AND r.id = m.role_id

          INNER JOIN devices d
            ON d.store_id = u.store_id
            AND d.id = ?5

          INNER JOIN employee_pin_credentials pin
            ON pin.store_id = u.store_id
            AND pin.user_id = u.id

          WHERE
            u.store_id = ?6
            AND u.id = ?7

            AND m.id = ?8
            AND r.id = ?9

            AND s.status = 'active'
            AND u.status = 'active'
            AND m.status = 'active'
            AND r.status = 'active'
            AND d.status = 'active'

            AND pin.status = 'active'
            AND pin.credential_version = ?4
        `)
        .bind(
          credential.sessionId,
          credential.secretHash,
          expiresAt,

          employee
            .pin_credential_version,

          deviceContext.device.id,
          deviceContext.store.id,

          employee.user_id,
          employee.membership_id,
          employee.role_id
        )
        .run()

    if (
      !insert.success ||
      insert.meta.changes !== 1
    ) {
      return {
        ok: false,
        error:
          'authentication_unavailable'
      }
    }

    await clearPinFailures(
      db,
      deviceContext,
      employee.user_id
    )

    return {
      ok: true,

      value: {
        sessionId:
          credential.sessionId,

        sessionToken:
          credential.token,

        expiresAt,

        actor: {
          id:
            employee.user_id,

          displayName:
            employee.display_name,

          membershipId:
            employee.membership_id,

          roleId:
            employee.role_id,

          roleName:
            employee.role_name
        }
      }
    }
  } catch (error) {
    console.error(
      'Employee PIN authentication failed:',
      error
    )

    return {
      ok: false,
      error:
        'authentication_unavailable'
    }
  }
}
export type SessionAuthenticationResult =
  | {
      ok: true

      context: AuthContext

      session: AuthSessionResponse
    }
  | {
      ok: false

      error:
        | 'invalid_session'
        | 'session_expired'
        | 'session_revoked'
        | 'actor_inactive'
    }
export async function authenticateSession(
  db: D1Database,
  deviceContext: DeviceContext,
  token: string
): Promise<SessionAuthenticationResult> {
  const parsed =
    parseSessionToken(token)

  if (!parsed) {
    return {
      ok: false,
      error: 'invalid_session'
    }
  }

  const row =
    await db
      .prepare(`
        SELECT
          session.id AS session_id,

          session.session_token_hash,
          session.expires_at,

          session.store_id,
          session.device_id,

          u.id AS user_id,
          u.display_name,

          m.id AS membership_id,

          r.id AS role_id,
          r.name AS role_name,

          session.pin_credential_version

        FROM auth_sessions session

        INNER JOIN stores s
          ON s.id =
            session.store_id

        INNER JOIN devices d
          ON d.store_id =
            session.store_id
          AND d.id =
            session.device_id

        INNER JOIN users u
          ON u.store_id =
            session.store_id
          AND u.id =
            session.user_id

        INNER JOIN store_memberships m
          ON m.store_id =
            session.store_id
          AND m.id =
            session.membership_id
          AND m.user_id =
            session.user_id

        INNER JOIN roles r
          ON r.store_id =
            m.store_id
          AND r.id =
            m.role_id

        INNER JOIN employee_pin_credentials pin
          ON pin.store_id =
            session.store_id
          AND pin.user_id =
            session.user_id

        WHERE
          session.id = ?1

          AND session.store_id = ?2
          AND session.device_id = ?3

          AND session.revoked_at
            IS NULL

          AND julianday(
            session.expires_at
          ) > julianday('now')

          AND s.status = 'active'
          AND d.status = 'active'
          AND u.status = 'active'
          AND m.status = 'active'
          AND r.status = 'active'

          AND pin.status = 'active'

          AND
            session.pin_credential_version
              = pin.credential_version

        LIMIT 1
      `)
      .bind(
        parsed.sessionId,
        deviceContext.store.id,
        deviceContext.device.id
      )
      .first<SessionAuthRow>()

  if (!row) {
    return {
      ok: false,
      error: 'invalid_session'
    }
  }

  const secretIsValid =
    await verifySessionSecret(
      parsed.secret,
      row.session_token_hash
    )

  if (!secretIsValid) {
    return {
      ok: false,
      error: 'invalid_session'
    }
  }

  const context: AuthContext = {
    sessionId:
      row.session_id,

    storeId:
      row.store_id,

    deviceId:
      row.device_id,

    actorId:
      row.user_id,

    membershipId:
      row.membership_id,

    roleId:
      row.role_id,

    pinCredentialVersion:
      row.pin_credential_version
  }

  const session:
    AuthSessionResponse = {
      sessionId:
        row.session_id,

      expiresAt:
        row.expires_at,

      actor: {
        id:
          row.user_id,

        displayName:
          row.display_name,

        membershipId:
          row.membership_id,

        roleId:
          row.role_id,

        roleName:
          row.role_name
      }
    }

  return {
    ok: true,
    context,
    session
  }
}
export async function revokeAuthSession(
  db: D1Database,
  authContext: AuthContext,
  reason = 'logout'
): Promise<boolean> {
  const result =
    await db
      .prepare(`
        UPDATE auth_sessions

        SET
          revoked_at =
            COALESCE(
              revoked_at,
              CURRENT_TIMESTAMP
            ),

          revocation_reason =
            COALESCE(
              revocation_reason,
              ?4
            )

        WHERE
          id = ?1
          AND store_id = ?2
          AND device_id = ?3
      `)
      .bind(
        authContext.sessionId,
        authContext.storeId,
        authContext.deviceId,
        reason
      )
      .run()

  return (
    result.success &&
    result.meta.changes === 1
  )
}