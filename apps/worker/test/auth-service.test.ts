import { env } from "cloudflare:workers";

import { describe, expect, it } from "vitest";

import type { DeviceContext } from "@billiards/contracts";

import { derivePinHash, generatePinSalt } from "../src/security/pin-credential";

import { parseSessionToken } from "../src/security/session-credential";

import {
  authenticateEmployeePin,
  authenticateSession,
  listEmployeesForDevice,
  revokeAuthSession,
} from "../src/services/auth-service";

const TEST_PIN_ITERATIONS = 1_000;

const DEFAULT_PIN = "0012";

type AuthFixture = {
  storeId: string;
  roleId: string;
  userId: string;
  membershipId: string;

  deviceId: string;
  installationId: string;

  pin: string;

  deviceContext: DeviceContext;
};

// =========================================================
// TEST DATA HELPERS
// =========================================================

async function createStore(storeId: string): Promise<void> {
  await env.DB.prepare(
    `
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
    `,
  )
    .bind(storeId, `Store ${storeId}`, `store-${storeId}`)
    .run();
}

async function createRole(storeId: string, roleId: string): Promise<void> {
  await env.DB.prepare(
    `
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
        ?4,
        'active'
      )
    `,
  )
    .bind(roleId, storeId, `role-${roleId}`, "Thu ngân")
    .run();
}

async function createEmployee(
  storeId: string,
  userId: string,
  membershipId: string,
  roleId: string,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `
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
      `,
    ).bind(userId, storeId, userId, `Employee ${userId}`),

    env.DB.prepare(
      `
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
      `,
    ).bind(membershipId, storeId, userId, roleId),
  ]);
}

async function createDevice(
  storeId: string,
  deviceId: string,
): Promise<string> {
  const installationId = crypto.randomUUID();

  await env.DB.prepare(
    `
      INSERT INTO devices (
        id,
        store_id,
        installation_id,
        name,
        device_type,
        platform,
        status
      )

      VALUES (
        ?1,
        ?2,
        ?3,
        'Test POS',
        'desktop_pos',
        'windows',
        'active'
      )
    `,
  )
    .bind(deviceId, storeId, installationId)
    .run();

  return installationId;
}

async function createEmployeePin(
  storeId: string,
  userId: string,
  pin: string,
): Promise<void> {
  const salt = generatePinSalt();

  const hash = await derivePinHash(pin, salt, TEST_PIN_ITERATIONS);

  await env.DB.prepare(
    `
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
    `,
  )
    .bind(
      crypto.randomUUID(),

      storeId,
      userId,

      hash,
      salt,

      TEST_PIN_ITERATIONS,
    )
    .run();
}

function makeDeviceContext(
  storeId: string,
  deviceId: string,
  installationId: string,
): DeviceContext {
  return {
    device: {
      id: deviceId,

      name: "Test POS",

      installationId,

      type: "desktop_pos",

      platform: "windows",

      appVersion: "0.0.0",
    },

    store: {
      id: storeId,

      name: `Store ${storeId}`,

      timezone: "Asia/Ho_Chi_Minh",

      locale: "vi-VN",

      currency: "VND",
    },
  };
}

async function createAuthFixture(options?: {
  pin?: string;
  createPin?: boolean;
}): Promise<AuthFixture> {
  const suffix = crypto.randomUUID();

  const storeId = `store-${suffix}`;

  const roleId = `role-${suffix}`;

  const userId = `user-${suffix}`;

  const membershipId = `membership-${suffix}`;

  const deviceId = crypto.randomUUID();

  const pin = options?.pin ?? DEFAULT_PIN;

  await createStore(storeId);

  await createRole(storeId, roleId);

  await createEmployee(storeId, userId, membershipId, roleId);

  const installationId = await createDevice(storeId, deviceId);

  if (options?.createPin !== false) {
    await createEmployeePin(storeId, userId, pin);
  }

  const deviceContext = makeDeviceContext(storeId, deviceId, installationId);

  return {
    storeId,
    roleId,
    userId,
    membershipId,

    deviceId,
    installationId,

    pin,

    deviceContext,
  };
}

async function loginSuccessfully(fixture: AuthFixture) {
  const result = await authenticateEmployeePin(env.DB, fixture.deviceContext, {
    employeeId: fixture.userId,

    pin: fixture.pin,
  });

  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected successful login but received: ${result.error}`);
  }

  return result.value;
}

// =========================================================
// EMPLOYEE LIST
// =========================================================

describe("Employee authentication service", () => {
  it("lists active employees for the trusted Store", async () => {
    const fixture = await createAuthFixture();

    const result = await listEmployeesForDevice(env.DB, fixture.deviceContext);

    expect(result.employees).toContainEqual({
      id: fixture.userId,

      displayName: `Employee ${fixture.userId}`,

      roleName: "Thu ngân",

      hasPin: true,
    });
  });

  it("reports hasPin false when an employee has no PIN credential", async () => {
    const fixture = await createAuthFixture({
      createPin: false,
    });

    const result = await listEmployeesForDevice(env.DB, fixture.deviceContext);

    expect(result.employees).toContainEqual({
      id: fixture.userId,

      displayName: `Employee ${fixture.userId}`,

      roleName: "Thu ngân",

      hasPin: false,
    });
  });

  // =====================================================
  // CORRECT PIN
  // =====================================================

  it("creates an AuthSession for a correct PIN", async () => {
    const fixture = await createAuthFixture();

    const result = await authenticateEmployeePin(
      env.DB,
      fixture.deviceContext,
      {
        employeeId: fixture.userId,

        pin: fixture.pin,
      },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.value.actor.id).toBe(fixture.userId);

    expect(result.value.actor.membershipId).toBe(fixture.membershipId);

    expect(result.value.actor.roleId).toBe(fixture.roleId);

    expect(result.value.sessionToken).not.toBe("");

    expect(result.value.sessionId).not.toBe("");

    const parsed = parseSessionToken(result.value.sessionToken);

    expect(parsed).not.toBeNull();

    if (!parsed) {
      throw new Error("Expected a valid session token");
    }

    expect(parsed.sessionId).toBe(result.value.sessionId);

    const sessionRow = await env.DB.prepare(
      `
              SELECT
                session_token_hash,
                pin_credential_version

              FROM auth_sessions

              WHERE id = ?1

              LIMIT 1
            `,
    )
      .bind(result.value.sessionId)
      .first<{
        session_token_hash: string;

        pin_credential_version: number | null;
      }>();

    expect(sessionRow).not.toBeNull();

    if (!sessionRow) {
      throw new Error("Expected persisted AuthSession");
    }

    // Raw session secret must never be
    // persisted in D1.
    expect(sessionRow.session_token_hash).not.toBe(parsed.secret);

    expect(sessionRow.session_token_hash).not.toBe(result.value.sessionToken);

    expect(sessionRow.session_token_hash).toMatch(/^[a-f0-9]{64}$/i);

    expect(sessionRow.pin_credential_version).toBe(1);
  });

  // =====================================================
  // INCORRECT PIN
  // =====================================================

  it("rejects an incorrect PIN", async () => {
    const fixture = await createAuthFixture();

    const result = await authenticateEmployeePin(
      env.DB,
      fixture.deviceContext,
      {
        employeeId: fixture.userId,

        pin: "9999",
      },
    );

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_pin",
    });

    const state = await env.DB.prepare(
      `
              SELECT
                failed_attempts

              FROM employee_pin_auth_state

              WHERE
                store_id = ?1
                AND user_id = ?2
                AND device_id = ?3

              LIMIT 1
            `,
    )
      .bind(fixture.storeId, fixture.userId, fixture.deviceId)
      .first<{
        failed_attempts: number;
      }>();

    expect(state).not.toBeNull();

    expect(state?.failed_attempts).toBe(1);

    const sessionCount = await env.DB.prepare(
      `
              SELECT
                COUNT(*) AS count

              FROM auth_sessions

              WHERE
                store_id = ?1
                AND user_id = ?2
            `,
    )
      .bind(fixture.storeId, fixture.userId)
      .first<{
        count: number;
      }>();

    expect(sessionCount?.count ?? 0).toBe(0);
  });

  // =====================================================
  // PIN NOT CONFIGURED
  // =====================================================

  it("rejects login when the employee has no PIN configured", async () => {
    const fixture = await createAuthFixture({
      createPin: false,
    });

    const result = await authenticateEmployeePin(
      env.DB,
      fixture.deviceContext,
      {
        employeeId: fixture.userId,

        pin: DEFAULT_PIN,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      error: "pin_not_configured",
    });
  });

  // =====================================================
  // LOCKOUT
  // =====================================================

  it("locks the employee on the fifth failed attempt", async () => {
    const fixture = await createAuthFixture();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await authenticateEmployeePin(
        env.DB,
        fixture.deviceContext,
        {
          employeeId: fixture.userId,

          pin: "9999",
        },
      );

      expect(result.ok).toBe(false);

      if (result.ok) {
        throw new Error("Expected failed PIN authentication");
      }

      if (attempt < 5) {
        expect(result.error).toBe("invalid_pin");
      } else {
        expect(result.error).toBe("pin_locked");

        expect(result.retryAfterSeconds).toBeGreaterThan(0);
      }
    }

    const state = await env.DB.prepare(
      `
              SELECT
                failed_attempts,
                locked_until

              FROM employee_pin_auth_state

              WHERE
                store_id = ?1
                AND user_id = ?2
                AND device_id = ?3

              LIMIT 1
            `,
    )
      .bind(fixture.storeId, fixture.userId, fixture.deviceId)
      .first<{
        failed_attempts: number;

        locked_until: string | null;
      }>();

    expect(state).not.toBeNull();

    expect(state?.failed_attempts).toBe(5);

    expect(state?.locked_until).not.toBeNull();
  });

  it("does not allow the correct PIN to bypass an active lockout", async () => {
    const fixture = await createAuthFixture();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await authenticateEmployeePin(env.DB, fixture.deviceContext, {
        employeeId: fixture.userId,

        pin: "9999",
      });
    }

    const result = await authenticateEmployeePin(
      env.DB,
      fixture.deviceContext,
      {
        employeeId: fixture.userId,

        pin: fixture.pin,
      },
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected PIN authentication to remain locked");
    }

    expect(result.error).toBe("pin_locked");

    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("clears PIN failure state after a successful login", async () => {
    const fixture = await createAuthFixture();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const wrongResult = await authenticateEmployeePin(
        env.DB,
        fixture.deviceContext,
        {
          employeeId: fixture.userId,

          pin: "9999",
        },
      );

      expect(wrongResult).toMatchObject({
        ok: false,
        error: "invalid_pin",
      });
    }

    const stateBefore = await env.DB.prepare(
      `
              SELECT
                failed_attempts

              FROM employee_pin_auth_state

              WHERE
                store_id = ?1
                AND user_id = ?2
                AND device_id = ?3
            `,
    )
      .bind(fixture.storeId, fixture.userId, fixture.deviceId)
      .first<{
        failed_attempts: number;
      }>();

    expect(stateBefore?.failed_attempts).toBe(2);

    const success = await authenticateEmployeePin(
      env.DB,
      fixture.deviceContext,
      {
        employeeId: fixture.userId,

        pin: fixture.pin,
      },
    );

    expect(success.ok).toBe(true);

    const stateAfter = await env.DB.prepare(
      `
              SELECT
                failed_attempts

              FROM employee_pin_auth_state

              WHERE
                store_id = ?1
                AND user_id = ?2
                AND device_id = ?3
            `,
    )
      .bind(fixture.storeId, fixture.userId, fixture.deviceId)
      .first<{
        failed_attempts: number;
      }>();

    expect(stateAfter).toBeNull();
  });

  // =====================================================
  // STORE ISOLATION
  // =====================================================

  it("does not allow a device from Store A to log in an employee from Store B", async () => {
    const storeA = await createAuthFixture();

    const storeB = await createAuthFixture();

    const result = await authenticateEmployeePin(env.DB, storeA.deviceContext, {
      employeeId: storeB.userId,

      pin: storeB.pin,
    });

    expect(result).toMatchObject({
      ok: false,
      error: "employee_not_available",
    });
  });

  // =====================================================
  // USER / MEMBERSHIP STATE
  // =====================================================

  it("does not allow a disabled employee to log in", async () => {
    const fixture = await createAuthFixture();

    await env.DB.prepare(
      `
            UPDATE users

            SET
              status = 'disabled',
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?1
              AND id = ?2
          `,
    )
      .bind(fixture.storeId, fixture.userId)
      .run();

    const result = await authenticateEmployeePin(
      env.DB,
      fixture.deviceContext,
      {
        employeeId: fixture.userId,

        pin: fixture.pin,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      error: "employee_not_available",
    });
  });

  it("does not allow a suspended membership to log in", async () => {
    const fixture = await createAuthFixture();

    await env.DB.prepare(
      `
            UPDATE store_memberships

            SET
              status = 'suspended',
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?1
              AND id = ?2
          `,
    )
      .bind(fixture.storeId, fixture.membershipId)
      .run();

    const result = await authenticateEmployeePin(
      env.DB,
      fixture.deviceContext,
      {
        employeeId: fixture.userId,

        pin: fixture.pin,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      error: "employee_not_available",
    });
  });

  // =====================================================
  // TRUSTED AUTH CONTEXT
  // =====================================================

  it("resolves a valid session into a trusted AuthContext", async () => {
    const fixture = await createAuthFixture();

    const login = await loginSuccessfully(fixture);

    const authenticated = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(authenticated.ok).toBe(true);

    if (!authenticated.ok) {
      throw new Error(authenticated.error);
    }

    expect(authenticated.context.sessionId).toBe(login.sessionId);

    expect(authenticated.context.storeId).toBe(fixture.storeId);

    expect(authenticated.context.deviceId).toBe(fixture.deviceId);

    expect(authenticated.context.actorId).toBe(fixture.userId);

    expect(authenticated.context.membershipId).toBe(fixture.membershipId);

    expect(authenticated.context.roleId).toBe(fixture.roleId);

    expect(authenticated.context.pinCredentialVersion).toBe(1);

    expect(authenticated.session.actor.id).toBe(fixture.userId);

    expect(authenticated.session).not.toHaveProperty("sessionToken");
  });

  // =====================================================
  // DEVICE BINDING
  // =====================================================

  it("does not allow a session created on Device A to be used on Device B", async () => {
    const fixture = await createAuthFixture();

    const login = await loginSuccessfully(fixture);

    const deviceBId = crypto.randomUUID();

    const deviceBInstallationId = await createDevice(
      fixture.storeId,
      deviceBId,
    );

    const deviceBContext = makeDeviceContext(
      fixture.storeId,
      deviceBId,
      deviceBInstallationId,
    );

    const result = await authenticateSession(
      env.DB,
      deviceBContext,
      login.sessionToken,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_session",
    });
  });

  // =====================================================
  // PIN CREDENTIAL VERSION
  // =====================================================

  it("invalidates an existing session when the PIN credential version changes", async () => {
    const fixture = await createAuthFixture();

    const login = await loginSuccessfully(fixture);

    const before = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(before.ok).toBe(true);

    await env.DB.prepare(
      `
            UPDATE employee_pin_credentials

            SET
              credential_version =
                credential_version + 1,

              rotated_at =
                CURRENT_TIMESTAMP,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?1
              AND user_id = ?2
          `,
    )
      .bind(fixture.storeId, fixture.userId)
      .run();

    const after = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(after).toMatchObject({
      ok: false,
      error: "invalid_session",
    });
  });

  // =====================================================
  // SESSION EXPIRATION
  // =====================================================

  it("rejects an expired session", async () => {
    const fixture = await createAuthFixture();

    const login = await loginSuccessfully(fixture);

    await env.DB.prepare(
      `
            UPDATE auth_sessions

            SET
              expires_at =
                datetime(
                  'now',
                  '-1 minute'
                )

            WHERE id = ?1
          `,
    )
      .bind(login.sessionId)
      .run();

    const result = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_session",
    });
  });

  // =====================================================
  // CURRENT ACTOR STATE
  // =====================================================

  it("rejects an existing session when the employee becomes disabled", async () => {
    const fixture = await createAuthFixture();

    const login = await loginSuccessfully(fixture);

    await env.DB.prepare(
      `
            UPDATE users

            SET
              status = 'disabled',
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?1
              AND id = ?2
          `,
    )
      .bind(fixture.storeId, fixture.userId)
      .run();

    const result = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_session",
    });
  });

  it("rejects an existing session when the membership becomes suspended", async () => {
    const fixture = await createAuthFixture();

    const login = await loginSuccessfully(fixture);

    await env.DB.prepare(
      `
            UPDATE store_memberships

            SET
              status = 'suspended',
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?1
              AND id = ?2
          `,
    )
      .bind(fixture.storeId, fixture.membershipId)
      .run();

    const result = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_session",
    });
  });

  it("rejects an existing session when the device becomes revoked", async () => {
    const fixture = await createAuthFixture();

    const login = await loginSuccessfully(fixture);

    await env.DB.prepare(
      `
            UPDATE devices

            SET
              status = 'revoked',
              revoked_at =
                CURRENT_TIMESTAMP,
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              store_id = ?1
              AND id = ?2
          `,
    )
      .bind(fixture.storeId, fixture.deviceId)
      .run();

    const result = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_session",
    });
  });

  // =====================================================
  // LOGOUT / REVOCATION
  // =====================================================

  it("revokes the AuthSession on logout", async () => {
    const fixture = await createAuthFixture();

    const login = await loginSuccessfully(fixture);

    const authenticated = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(authenticated.ok).toBe(true);

    if (!authenticated.ok) {
      throw new Error(authenticated.error);
    }

    const revoked = await revokeAuthSession(env.DB, authenticated.context);

    expect(revoked).toBe(true);

    const row = await env.DB.prepare(
      `
              SELECT
                revoked_at,
                revocation_reason

              FROM auth_sessions

              WHERE id = ?1

              LIMIT 1
            `,
    )
      .bind(login.sessionId)
      .first<{
        revoked_at: string | null;

        revocation_reason: string | null;
      }>();

    expect(row).not.toBeNull();

    expect(row?.revoked_at).not.toBeNull();

    expect(row?.revocation_reason).toBe("logout");

    const afterLogout = await authenticateSession(
      env.DB,
      fixture.deviceContext,
      login.sessionToken,
    );

    expect(afterLogout).toMatchObject({
      ok: false,
      error: "invalid_session",
    });
  });

  // =====================================================
  // RAW PIN STORAGE
  // =====================================================

  it("never stores the raw employee PIN in the PIN credential row", async () => {
    const fixture = await createAuthFixture({
      pin: "123456",
    });

    const row = await env.DB.prepare(
      `
              SELECT
                pin_hash,
                pin_salt

              FROM employee_pin_credentials

              WHERE
                store_id = ?1
                AND user_id = ?2

              LIMIT 1
            `,
    )
      .bind(fixture.storeId, fixture.userId)
      .first<{
        pin_hash: string;
        pin_salt: string;
      }>();

    expect(row).not.toBeNull();

    expect(row?.pin_hash).not.toBe(fixture.pin);

    expect(row?.pin_salt).not.toBe(fixture.pin);

    expect(row?.pin_hash).toMatch(/^[a-f0-9]{64}$/i);
  });
});
