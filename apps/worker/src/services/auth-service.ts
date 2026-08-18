import type {
  AuthContext,
  AuthSessionResponse,
  DeviceContext,
  EmployeeListResponse,
  LoginResponse,
  PasswordLoginRequest,
  PermissionKey,
  PinLoginRequest,
  PinLoginResponse,
  StoreSummary
} from '@billiards/contracts'

import {
  PIN_KDF_ALGORITHM,
  createPinHash,
  verifyPin
} from '../security/pin-credential'

import {
  createPasswordHash,
  verifyPassword
} from '../security/password-credential'

import {
  createSessionCredential,
  hashSessionSecret,
  parseSessionToken,
  verifySessionSecret
} from '../security/session-credential'

const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const PIN_FAILURE_WINDOW_MINUTES = 15

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
  pin_credential_version: number | null
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
  pin_credential_version: number | null
}

export type PasswordLoginResult =
  | {
      ok: true
      value: LoginResponse
    }
  | {
      ok: false
      error:
        | 'invalid_credentials'
        | 'user_disabled'
        | 'store_inactive'
        | 'role_mismatch'
        | 'authentication_unavailable'
    }

type UserLoginQueryRow = {
  user_id: string
  username: string
  display_name: string
  email: string | null
  phone: string | null
  user_status: string

  store_id: string
  store_name: string
  store_slug: string
  store_address: string | null
  store_phone: string | null
  store_currency: string
  store_status: string

  membership_id: string
  membership_status: string

  role_id: string
  role_code: string
  role_name: string
  role_status: string

  password_hash: string | null
  password_salt: string | null
  kdf_algorithm: string | null
  kdf_iterations: number | null
  password_status: string | null

  has_pin: number
}

export async function loginWithPassword(
  db: D1Database,
  request: PasswordLoginRequest
): Promise<PasswordLoginResult> {
  const usernameNormalized = request.username.trim().toLowerCase()

  try {
    const userRow = await db
      .prepare(`
        SELECT
          u.id AS user_id,
          u.username,
          u.display_name,
          u.email,
          u.phone,
          u.status AS user_status,

          s.id AS store_id,
          s.name AS store_name,
          s.slug AS store_slug,
          s.address_text AS store_address,
          s.phone AS store_phone,
          s.currency AS store_currency,
          s.status AS store_status,

          m.id AS membership_id,
          m.status AS membership_status,

          r.id AS role_id,
          r.code AS role_code,
          r.name AS role_name,
          r.status AS role_status,

          pwd.password_hash,
          pwd.password_salt,
          pwd.kdf_algorithm,
          pwd.kdf_iterations,
          pwd.status AS password_status,

          CASE
            WHEN pin.id IS NOT NULL AND pin.status = 'active' THEN 1
            ELSE 0
          END AS has_pin

        FROM users u

        INNER JOIN stores s
          ON s.id = u.store_id

        INNER JOIN store_memberships m
          ON m.store_id = u.store_id
          AND m.user_id = u.id

        INNER JOIN roles r
          ON r.store_id = u.store_id
          AND r.id = m.role_id

        LEFT JOIN user_password_credentials pwd
          ON pwd.store_id = u.store_id
          AND pwd.user_id = u.id

        LEFT JOIN employee_pin_credentials pin
          ON pin.store_id = u.store_id
          AND pin.user_id = u.id

        WHERE (
          u.username_normalized = ?1
          OR LOWER(u.email) = ?1
          OR u.phone = ?1
        )
        AND u.status != 'disabled'

        LIMIT 1
      `)
      .bind(usernameNormalized)
      .first<UserLoginQueryRow>()

    if (!userRow) {
      return { ok: false, error: 'invalid_credentials' }
    }

    if (userRow.store_status !== 'active') {
      return { ok: false, error: 'store_inactive' }
    }

    if (userRow.user_status !== 'active' || userRow.membership_status !== 'active' || userRow.role_status !== 'active') {
      return { ok: false, error: 'user_disabled' }
    }

    if (request.roleType) {
      const isOwnerRole = userRow.role_code === 'owner' || userRow.role_code === 'manager'
      if (request.roleType === 'owner' && !isOwnerRole) {
        return { ok: false, error: 'role_mismatch' }
      }
    }

    if (!userRow.password_hash || !userRow.password_salt || !userRow.kdf_iterations || userRow.password_status !== 'active') {
      return { ok: false, error: 'invalid_credentials' }
    }

    const isPasswordValid = await verifyPassword(
      request.password,
      userRow.password_salt,
      userRow.password_hash,
      userRow.kdf_iterations
    )

    if (!isPasswordValid) {
      return { ok: false, error: 'invalid_credentials' }
    }

    // Fetch Role Permissions
    const permRows = await db
      .prepare(`
        SELECT permission_key
        FROM role_permissions
        WHERE store_id = ?1 AND role_id = ?2
      `)
      .bind(userRow.store_id, userRow.role_id)
      .all<{ permission_key: string }>()

    const permissions = permRows.results.map((r) => r.permission_key as PermissionKey)

    // Ensure a default device exists for this store in control plane
    let device = await db
      .prepare(`SELECT id FROM devices WHERE store_id = ?1 AND status = 'active' LIMIT 1`)
      .bind(userRow.store_id)
      .first<{ id: string }>()

    if (!device) {
      const defaultDeviceId = `dev_${crypto.randomUUID().slice(0, 8)}`
      await db
        .prepare(`
          INSERT INTO devices (id, store_id, name, installation_id, device_type, platform, status)
          VALUES (?1, ?2, 'Main POS Desktop', ?3, 'desktop_pos', 'windows', 'active')
        `)
        .bind(defaultDeviceId, userRow.store_id, `inst_${userRow.store_id}`)
        .run()
      device = { id: defaultDeviceId }
    }

    // Generate session token
    const credential = await createSessionCredential()
    const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString()

    await db
      .prepare(`
        INSERT INTO auth_sessions (
          id, store_id, user_id, membership_id, device_id,
          session_token_hash, expires_at, created_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)
      `)
      .bind(
        credential.sessionId,
        userRow.store_id,
        userRow.user_id,
        userRow.membership_id,
        device.id,
        credential.secretHash,
        expiresAt
      )
      .run()

    const store: StoreSummary = {
      id: userRow.store_id,
      name: userRow.store_name,
      slug: userRow.store_slug,
      address: userRow.store_address,
      phone: userRow.store_phone,
      currency: userRow.store_currency
    }

    return {
      ok: true,
      value: {
        ok: true,
        sessionId: credential.sessionId,
        sessionToken: credential.token,
        expiresAt,
        store,
        user: {
          id: userRow.user_id,
          username: userRow.username,
          displayName: userRow.display_name,
          email: userRow.email,
          phone: userRow.phone,
          roleCode: userRow.role_code,
          roleName: userRow.role_name,
          hasPin: userRow.has_pin === 1,
          permissions
        }
      }
    }
  } catch (error) {
    console.error('Password login failed:', error)
    return { ok: false, error: 'authentication_unavailable' }
  }
}

// =========================================================
// VERIFY 4-DIGIT PIN (For sensitive / protected actions)
// =========================================================

export type VerifyPinResult =
  | { ok: true }
  | { ok: false; error: 'invalid_pin' | 'pin_not_set' | 'pin_locked' | 'verification_unavailable' }

export async function verifyUserPin(
  db: D1Database,
  storeId: string,
  userId: string,
  pin: string
): Promise<VerifyPinResult> {
  try {
    const pinRow = await db
      .prepare(`
        SELECT pin_hash, pin_salt, kdf_iterations, status
        FROM employee_pin_credentials
        WHERE store_id = ?1 AND user_id = ?2
        LIMIT 1
      `)
      .bind(storeId, userId)
      .first<{
        pin_hash: string
        pin_salt: string
        kdf_iterations: number
        status: string
      }>()

    if (!pinRow || pinRow.status !== 'active') {
      return { ok: false, error: 'pin_not_set' }
    }

    const isValid = await verifyPin(pin, pinRow.pin_salt, pinRow.pin_hash, pinRow.kdf_iterations)

    if (!isValid) {
      return { ok: false, error: 'invalid_pin' }
    }

    return { ok: true }
  } catch (error) {
    console.error('Verify PIN error:', error)
    return { ok: false, error: 'verification_unavailable' }
  }
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
        r.code = 'owner' DESC,
        u.display_name ASC
    `)
    .bind(deviceContext.store.id)
    .all<EmployeeListRow>()

  return {
    employees: result.results.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      roleName: row.role_name,
      hasPin: row.has_pin === 1
    }))
  }
}

export async function authenticateEmployeePin(
  db: D1Database,
  deviceContext: DeviceContext,
  input: PinLoginRequest
): Promise<
  | { ok: true; value: PinLoginResponse }
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
> {
  const employee = await db
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
        pin.credential_version AS pin_credential_version,
        pin.status AS pin_status
      FROM users u
      INNER JOIN stores s ON s.id = u.store_id
      INNER JOIN store_memberships m ON m.store_id = u.store_id AND m.user_id = u.id
      INNER JOIN roles r ON r.store_id = m.store_id AND r.id = m.role_id
      LEFT JOIN employee_pin_credentials pin ON pin.store_id = u.store_id AND pin.user_id = u.id
      WHERE
        u.store_id = ?1
        AND u.id = ?2
        AND s.status = 'active'
        AND u.status = 'active'
        AND m.status = 'active'
        AND r.status = 'active'
      LIMIT 1
    `)
    .bind(deviceContext.store.id, input.employeeId)
    .first<EmployeeLoginRow>()

  if (!employee) {
    return { ok: false, error: 'employee_not_available' }
  }

  if (
    !employee.pin_hash ||
    !employee.pin_salt ||
    !employee.kdf_iterations ||
    employee.kdf_algorithm !== PIN_KDF_ALGORITHM ||
    employee.pin_status !== 'active' ||
    employee.pin_credential_version === null
  ) {
    return { ok: false, error: 'pin_not_configured' }
  }

  const authState = await db
    .prepare(`
      SELECT
        failed_attempts,
        locked_until,
        CASE
          WHEN locked_until IS NOT NULL
            AND julianday(locked_until) > julianday('now')
          THEN CAST((julianday(locked_until) - julianday('now')) * 86400 AS INTEGER)
          ELSE 0
        END AS retry_after_seconds
      FROM employee_pin_auth_state
      WHERE store_id = ?1 AND user_id = ?2 AND device_id = ?3
      LIMIT 1
    `)
    .bind(deviceContext.store.id, employee.user_id, deviceContext.device.id)
    .first<PinAuthStateRow>()

  if (authState && authState.retry_after_seconds > 0) {
    return {
      ok: false,
      error: 'pin_locked',
      retryAfterSeconds: authState.retry_after_seconds
    }
  }

  const pinIsValid = await verifyPin(
    input.pin,
    employee.pin_salt,
    employee.pin_hash,
    employee.kdf_iterations
  )

  if (!pinIsValid) {
    const failure = await recordPinFailure(db, deviceContext, employee.user_id)
    if (failure.retry_after_seconds > 0) {
      return {
        ok: false,
        error: 'pin_locked',
        retryAfterSeconds: failure.retry_after_seconds
      }
    }
    return { ok: false, error: 'invalid_pin' }
  }

  const credential = await createSessionCredential()
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString()

  try {
    const insert = await db
      .prepare(`
        INSERT INTO auth_sessions (
          id, store_id, user_id, membership_id, device_id,
          session_token_hash, expires_at, created_at, pin_credential_version
        )
        SELECT
          ?1, u.store_id, u.id, m.id, d.id,
          ?2, ?3, CURRENT_TIMESTAMP, ?4
        FROM users u
        INNER JOIN stores s ON s.id = u.store_id
        INNER JOIN store_memberships m ON m.store_id = u.store_id AND m.user_id = u.id
        INNER JOIN roles r ON r.store_id = m.store_id AND r.id = m.role_id
        INNER JOIN devices d ON d.store_id = u.store_id AND d.id = ?5
        INNER JOIN employee_pin_credentials pin ON pin.store_id = u.store_id AND pin.user_id = u.id
        WHERE
          u.store_id = ?6 AND u.id = ?7 AND m.id = ?8 AND r.id = ?9
          AND s.status = 'active' AND u.status = 'active' AND m.status = 'active'
          AND r.status = 'active' AND d.status = 'active'
          AND pin.status = 'active' AND pin.credential_version = ?4
      `)
      .bind(
        credential.sessionId,
        credential.secretHash,
        expiresAt,
        employee.pin_credential_version,
        deviceContext.device.id,
        deviceContext.store.id,
        employee.user_id,
        employee.membership_id,
        employee.role_id
      )
      .run()

    if (!insert.success || insert.meta.changes !== 1) {
      return { ok: false, error: 'authentication_unavailable' }
    }

    await clearPinFailures(db, deviceContext, employee.user_id)

    return {
      ok: true,
      value: {
        sessionId: credential.sessionId,
        sessionToken: credential.token,
        expiresAt,
        actor: {
          id: employee.user_id,
          displayName: employee.display_name,
          membershipId: employee.membership_id,
          roleId: employee.role_id,
          roleName: employee.role_name
        }
      }
    }
  } catch (error) {
    console.error('Employee PIN authentication failed:', error)
    return { ok: false, error: 'authentication_unavailable' }
  }
}

async function recordPinFailure(
  db: D1Database,
  deviceContext: DeviceContext,
  userId: string
): Promise<{ retry_after_seconds: number }> {
  const windowMinutes = PIN_FAILURE_WINDOW_MINUTES

  await db
    .prepare(`
      INSERT INTO employee_pin_auth_state (
        store_id, user_id, device_id,
        failed_attempts, failure_window_started_at, last_failed_at, locked_until, updated_at
      )
      VALUES (
        ?1, ?2, ?3,
        1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP
      )
      ON CONFLICT (store_id, user_id, device_id) DO UPDATE SET
        failed_attempts = CASE
          WHEN failure_window_started_at IS NULL
            OR julianday('now') - julianday(failure_window_started_at) > (?4 / 1440.0)
          THEN 1
          ELSE failed_attempts + 1
        END,
        failure_window_started_at = CASE
          WHEN failure_window_started_at IS NULL
            OR julianday('now') - julianday(failure_window_started_at) > (?4 / 1440.0)
          THEN CURRENT_TIMESTAMP
          ELSE failure_window_started_at
        END,
        last_failed_at = CURRENT_TIMESTAMP,
        locked_until = CASE
          WHEN (
            CASE
              WHEN failure_window_started_at IS NULL
                OR julianday('now') - julianday(failure_window_started_at) > (?4 / 1440.0)
              THEN 1
              ELSE failed_attempts + 1
            END
          ) >= 5
          THEN datetime('now', '+15 minutes')
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(
      deviceContext.store.id,
      userId,
      deviceContext.device.id,
      windowMinutes
    )
    .run()

  const state = await db
    .prepare(`
      SELECT
        CASE
          WHEN locked_until IS NOT NULL
            AND julianday(locked_until) > julianday('now')
          THEN CAST((julianday(locked_until) - julianday('now')) * 86400 AS INTEGER)
          ELSE 0
        END AS retry_after_seconds
      FROM employee_pin_auth_state
      WHERE store_id = ?1 AND user_id = ?2 AND device_id = ?3
    `)
    .bind(deviceContext.store.id, userId, deviceContext.device.id)
    .first<{ retry_after_seconds: number }>()

  return { retry_after_seconds: state?.retry_after_seconds ?? 0 }
}

async function clearPinFailures(
  db: D1Database,
  deviceContext: DeviceContext,
  userId: string
): Promise<void> {
  await db
    .prepare(`
      DELETE FROM employee_pin_auth_state
      WHERE store_id = ?1 AND user_id = ?2 AND device_id = ?3
    `)
    .bind(deviceContext.store.id, userId, deviceContext.device.id)
    .run()
}

export type SessionAuthenticationResult =
  | {
      ok: true
      context: AuthContext
      session: AuthSessionResponse
    }
  | {
      ok: false
      error: 'invalid_session' | 'session_expired' | 'session_revoked' | 'actor_inactive'
    }

export async function authenticateSession(
  db: D1Database,
  deviceContext: DeviceContext | undefined,
  token: string
): Promise<SessionAuthenticationResult> {
  const parsed = parseSessionToken(token)

  if (!parsed) {
    return { ok: false, error: 'invalid_session' }
  }

  // Device-scoped query if deviceContext is provided, otherwise store-scoped
  const query = deviceContext
    ? `
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
      INNER JOIN stores s ON s.id = session.store_id
      INNER JOIN devices d ON d.store_id = session.store_id AND d.id = session.device_id
      INNER JOIN users u ON u.store_id = session.store_id AND u.id = session.user_id
      INNER JOIN store_memberships m ON m.store_id = session.store_id AND m.id = session.membership_id AND m.user_id = session.user_id
      INNER JOIN roles r ON r.store_id = m.store_id AND r.id = m.role_id
      LEFT JOIN employee_pin_credentials pin ON pin.store_id = session.store_id AND pin.user_id = session.user_id
      WHERE
        session.id = ?1
        AND session.store_id = ?2
        AND session.device_id = ?3
        AND session.revoked_at IS NULL
        AND julianday(session.expires_at) > julianday('now')
        AND s.status = 'active'
        AND d.status = 'active'
        AND u.status = 'active'
        AND m.status = 'active'
        AND r.status = 'active'
        AND (
          session.pin_credential_version IS NULL
          OR (pin.status = 'active' AND session.pin_credential_version = pin.credential_version)
        )
      LIMIT 1
    `
    : `
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
      INNER JOIN stores s ON s.id = session.store_id
      INNER JOIN devices d ON d.store_id = session.store_id AND d.id = session.device_id
      INNER JOIN users u ON u.store_id = session.store_id AND u.id = session.user_id
      INNER JOIN store_memberships m ON m.store_id = session.store_id AND m.id = session.membership_id AND m.user_id = session.user_id
      INNER JOIN roles r ON r.store_id = m.store_id AND r.id = m.role_id
      LEFT JOIN employee_pin_credentials pin ON pin.store_id = session.store_id AND pin.user_id = session.user_id
      WHERE
        session.id = ?1
        AND session.revoked_at IS NULL
        AND julianday(session.expires_at) > julianday('now')
        AND s.status = 'active'
        AND d.status = 'active'
        AND u.status = 'active'
        AND m.status = 'active'
        AND r.status = 'active'
        AND (
          session.pin_credential_version IS NULL
          OR (pin.status = 'active' AND session.pin_credential_version = pin.credential_version)
        )
      LIMIT 1
    `

  const statement = deviceContext
    ? db.prepare(query).bind(parsed.sessionId, deviceContext.store.id, deviceContext.device.id)
    : db.prepare(query).bind(parsed.sessionId)

  const row = await statement.first<SessionAuthRow>()

  if (!row) {
    return { ok: false, error: 'invalid_session' }
  }

  const secretIsValid = await verifySessionSecret(
    parsed.secret,
    row.session_token_hash
  )

  if (!secretIsValid) {
    return { ok: false, error: 'invalid_session' }
  }

  const context: AuthContext = {
    sessionId: row.session_id,
    storeId: row.store_id,
    deviceId: row.device_id,
    actorId: row.user_id,
    membershipId: row.membership_id,
    roleId: row.role_id,
    pinCredentialVersion: row.pin_credential_version
  }

  const session: AuthSessionResponse = {
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    actor: {
      id: row.user_id,
      displayName: row.display_name,
      membershipId: row.membership_id,
      roleId: row.role_id,
      roleName: row.role_name
    }
  }

  return { ok: true, context, session }
}

export async function revokeAuthSession(
  db: D1Database,
  authContext: AuthContext,
  reason = 'logout'
): Promise<boolean> {
  const result = await db
    .prepare(`
      UPDATE auth_sessions
      SET
        revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
        revocation_reason = COALESCE(revocation_reason, ?4)
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

  return result.success && result.meta.changes === 1
}

// =========================================================
// PASSWORD & PIN CHANGE SERVICES
// =========================================================

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: 'invalid_current_password' | 'user_not_found' | 'database_error' }

export async function changeUserPassword(
  db: D1Database,
  userId: string,
  storeId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  try {
    const pwdRow = await db
      .prepare(`
        SELECT password_hash, password_salt, kdf_iterations, status
        FROM user_password_credentials
        WHERE user_id = ?1 AND store_id = ?2
      `)
      .bind(userId, storeId)
      .first<{
        password_hash: string
        password_salt: string
        kdf_iterations: number
        status: string
      }>()

    if (!pwdRow || pwdRow.status !== 'active') {
      return { ok: false, error: 'user_not_found' }
    }

    const isCurrentValid = await verifyPassword(
      currentPassword,
      pwdRow.password_salt,
      pwdRow.password_hash,
      pwdRow.kdf_iterations
    )

    if (!isCurrentValid) {
      return { ok: false, error: 'invalid_current_password' }
    }

    const newPwdData = await createPasswordHash(newPassword)

    await db
      .prepare(`
        UPDATE user_password_credentials
        SET
          password_hash = ?1,
          password_salt = ?2,
          kdf_algorithm = ?3,
          kdf_iterations = ?4,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?5 AND store_id = ?6
      `)
      .bind(
        newPwdData.hash,
        newPwdData.salt,
        newPwdData.algorithm,
        newPwdData.iterations,
        userId,
        storeId
      )
      .run()

    return { ok: true }
  } catch (err) {
    console.error('changeUserPassword failed:', err)
    return { ok: false, error: 'database_error' }
  }
}

export type ChangePinResult =
  | { ok: true }
  | { ok: false; error: 'invalid_current_pin' | 'invalid_password' | 'user_not_found' | 'database_error' }

export async function changeUserPin(
  db: D1Database,
  userId: string,
  storeId: string,
  newPin: string,
  currentPin?: string,
  verifyPasswordInput?: string
): Promise<ChangePinResult> {
  try {
    if (verifyPasswordInput) {
      const pwdRow = await db
        .prepare(`
          SELECT password_hash, password_salt, kdf_iterations
          FROM user_password_credentials
          WHERE user_id = ?1 AND store_id = ?2
        `)
        .bind(userId, storeId)
        .first<{
          password_hash: string
          password_salt: string
          kdf_iterations: number
        }>()

      if (!pwdRow) return { ok: false, error: 'user_not_found' }

      const isPassValid = await verifyPassword(
        verifyPasswordInput,
        pwdRow.password_salt,
        pwdRow.password_hash,
        pwdRow.kdf_iterations
      )

      if (!isPassValid) {
        return { ok: false, error: 'invalid_password' }
      }
    } else if (currentPin) {
      const pinRow = await db
        .prepare(`
          SELECT pin_hash, pin_salt, kdf_iterations
          FROM employee_pin_credentials
          WHERE user_id = ?1 AND store_id = ?2
        `)
        .bind(userId, storeId)
        .first<{
          pin_hash: string
          pin_salt: string
          kdf_iterations: number
        }>()

      if (pinRow) {
        const isPinValid = await verifyPin(
          currentPin,
          pinRow.pin_salt,
          pinRow.pin_hash,
          pinRow.kdf_iterations
        )
        if (!isPinValid) {
          return { ok: false, error: 'invalid_current_pin' }
        }
      }
    }

    const newPinData = await createPinHash(newPin)
    const pinId = `pin_${crypto.randomUUID().slice(0, 8)}`

    await db
      .prepare(`
        INSERT INTO employee_pin_credentials (
          id, store_id, user_id, pin_hash, pin_salt, kdf_algorithm, kdf_iterations, status
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active')
        ON CONFLICT(store_id, user_id) DO UPDATE SET
          pin_hash = excluded.pin_hash,
          pin_salt = excluded.pin_salt,
          kdf_algorithm = excluded.kdf_algorithm,
          kdf_iterations = excluded.kdf_iterations,
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
      `)
      .bind(
        pinId,
        storeId,
        userId,
        newPinData.hash,
        newPinData.salt,
        newPinData.algorithm,
        newPinData.iterations
      )
      .run()

    return { ok: true }
  } catch (err) {
    console.error('changeUserPin failed:', err)
    return { ok: false, error: 'database_error' }
  }
}