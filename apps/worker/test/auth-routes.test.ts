import { env, exports } from "cloudflare:workers";

import { describe, expect, it } from "vitest";

import type { PinLoginResponse } from "@billiards/contracts";

import {
  generateDeviceSecret,
  sha256Hex,
} from "../src/security/device-credential";

import { derivePinHash, generatePinSalt } from "../src/security/pin-credential";

const TEST_PIN_ITERATIONS = 1_000;

const DEFAULT_PIN = "0012";

type HttpAuthFixture = {
  storeId: string;

  roleId: string;
  userId: string;
  membershipId: string;

  deviceId: string;
  deviceSecret: string;

  pin: string;
};

async function createHttpAuthFixture(options?: {
  createPin?: boolean;
}): Promise<HttpAuthFixture> {
  const suffix = crypto.randomUUID();

  const storeId = `store-${suffix}`;

  const roleId = `role-${suffix}`;

  const userId = `user-${suffix}`;

  const membershipId = `membership-${suffix}`;

  const deviceId = crypto.randomUUID();

  const installationId = crypto.randomUUID();

  const deviceSecret = generateDeviceSecret();

  const deviceCredentialHash = await sha256Hex(deviceSecret);

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
        'Thu ngân',
        'active'
      )
    `,
  )
    .bind(roleId, storeId, `role-${roleId}`)
    .run();

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

  await env.DB.prepare(
    `
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

        'Test POS',
        'desktop_pos',
        'windows',
        'active',

        ?4,
        CURRENT_TIMESTAMP,
        1
      )
    `,
  )
    .bind(deviceId, storeId, installationId, deviceCredentialHash)
    .run();

  if (options?.createPin !== false) {
    const salt = generatePinSalt();

    const hash = await derivePinHash(DEFAULT_PIN, salt, TEST_PIN_ITERATIONS);

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

  return {
    storeId,

    roleId,
    userId,
    membershipId,

    deviceId,
    deviceSecret,

    pin: DEFAULT_PIN,
  };
}

function deviceAuthorization(fixture: HttpAuthFixture): string {
  return ["Device ", fixture.deviceId, ".", fixture.deviceSecret].join("");
}

async function loginThroughHttp(
  fixture: HttpAuthFixture,
): Promise<PinLoginResponse> {
  const response = await exports.default.fetch(
    new Request("https://example.test/api/auth/pin", {
      method: "POST",

      headers: {
        Authorization: deviceAuthorization(fixture),

        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        employeeId: fixture.userId,

        pin: fixture.pin,
      }),
    }),
  );

  expect(response.status).toBe(200);

  return response.json<PinLoginResponse>();
}

describe("Authentication HTTP routes", () => {
  it("requires Device authentication before listing employees", async () => {
    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/employees"),
    );

    expect(response.status).toBe(401);

    expect(await response.json()).toMatchObject({
      ok: false,
      error: "device_auth_required",
    });
  });

  it("lists employees for an authenticated Device", async () => {
    const fixture = await createHttpAuthFixture();

    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/employees", {
        headers: {
          Authorization: deviceAuthorization(fixture),
        },
      }),
    );

    expect(response.status).toBe(200);

    const body = await response.json<{
      employees: Array<{
        id: string;
        displayName: string;
        roleName: string;
        hasPin: boolean;
      }>;
    }>();

    expect(body.employees).toContainEqual({
      id: fixture.userId,

      displayName: `Employee ${fixture.userId}`,

      roleName: "Thu ngân",

      hasPin: true,
    });
  });

  it("rejects invalid JSON during PIN login", async () => {
    const fixture = await createHttpAuthFixture();

    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/pin", {
        method: "POST",

        headers: {
          Authorization: deviceAuthorization(fixture),

          "Content-Type": "application/json",
        },

        body: "{broken-json",
      }),
    );

    expect(response.status).toBe(400);

    expect(await response.json()).toMatchObject({
      ok: false,
      error: "invalid_json",
    });
  });

  it("rejects client supplied storeId in the PIN login body", async () => {
    const fixture = await createHttpAuthFixture();

    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/pin", {
        method: "POST",

        headers: {
          Authorization: deviceAuthorization(fixture),

          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          employeeId: fixture.userId,

          pin: fixture.pin,

          storeId: "attacker-store",
        }),
      }),
    );

    expect(response.status).toBe(400);

    expect(await response.json()).toMatchObject({
      ok: false,
      error: "invalid_request",
    });
  });

  it("rejects an incorrect PIN without revealing employee availability", async () => {
    const fixture = await createHttpAuthFixture();

    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/pin", {
        method: "POST",

        headers: {
          Authorization: deviceAuthorization(fixture),

          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          employeeId: fixture.userId,

          pin: "9999",
        }),
      }),
    );

    expect(response.status).toBe(401);

    expect(await response.json()).toMatchObject({
      ok: false,
      error: "invalid_employee_or_pin",
    });
  });

  it("returns pin_not_configured for an employee without a PIN", async () => {
    const fixture = await createHttpAuthFixture({
      createPin: false,
    });

    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/pin", {
        method: "POST",

        headers: {
          Authorization: deviceAuthorization(fixture),

          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          employeeId: fixture.userId,

          pin: fixture.pin,
        }),
      }),
    );

    expect(response.status).toBe(409);

    expect(await response.json()).toMatchObject({
      ok: false,
      error: "pin_not_configured",
    });
  });

  it("creates an AuthSession through the PIN login endpoint", async () => {
    const fixture = await createHttpAuthFixture();

    const login = await loginThroughHttp(fixture);

    expect(login.actor.id).toBe(fixture.userId);

    expect(login.actor.membershipId).toBe(fixture.membershipId);

    expect(login.actor.roleId).toBe(fixture.roleId);

    expect(login.sessionToken).not.toBe("");
  });

  it("returns 429 and Retry-After after repeated incorrect PIN attempts", async () => {
    const fixture = await createHttpAuthFixture();

    let finalResponse: Response | null = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      finalResponse = await exports.default.fetch(
        new Request("https://example.test/api/auth/pin", {
          method: "POST",

          headers: {
            Authorization: deviceAuthorization(fixture),

            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            employeeId: fixture.userId,

            pin: "9999",
          }),
        }),
      );
    }

    expect(finalResponse).not.toBeNull();

    if (!finalResponse) {
      throw new Error("Expected lockout response");
    }

    expect(finalResponse.status).toBe(429);

    const retryAfter = Number(finalResponse.headers.get("Retry-After"));

    expect(retryAfter).toBeGreaterThan(0);

    const body = await finalResponse.json<{
      ok: false;
      error: string;
      retryAfterSeconds: number;
    }>();

    expect(body.error).toBe("pin_locked");

    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("requires an AuthSession for the session endpoint", async () => {
    const fixture = await createHttpAuthFixture();

    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/session", {
        headers: {
          Authorization: deviceAuthorization(fixture),
        },
      }),
    );

    expect(response.status).toBe(401);

    expect(await response.json()).toMatchObject({
      ok: false,
      error: "auth_session_required",
    });
  });

  it("returns the authenticated session without echoing the raw token", async () => {
    const fixture = await createHttpAuthFixture();

    const login = await loginThroughHttp(fixture);

    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/session", {
        headers: {
          Authorization: deviceAuthorization(fixture),

          "X-Auth-Session": login.sessionToken,
        },
      }),
    );

    expect(response.status).toBe(200);

    const body = await response.json<Record<string, unknown>>();

    expect(body).toMatchObject({
      sessionId: login.sessionId,
    });

    expect(body).not.toHaveProperty("sessionToken");
  });

  it("rejects a session token when used with a different Device", async () => {
    const fixtureA = await createHttpAuthFixture();

    const login = await loginThroughHttp(fixtureA);

    const secondDeviceId = crypto.randomUUID();

    const secondSecret = generateDeviceSecret();

    const secondHash = await sha256Hex(secondSecret);

    await env.DB.prepare(
      `
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

              'Second POS',
              'desktop_pos',
              'windows',
              'active',

              ?4,
              CURRENT_TIMESTAMP,
              1
            )
          `,
    )
      .bind(
        secondDeviceId,

        fixtureA.storeId,

        crypto.randomUUID(),

        secondHash,
      )
      .run();

    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/session", {
        headers: {
          Authorization: `Device ${secondDeviceId}.${secondSecret}`,

          "X-Auth-Session": login.sessionToken,
        },
      }),
    );

    expect(response.status).toBe(401);

    expect(await response.json()).toMatchObject({
      ok: false,
      error: "invalid_auth_session",
    });
  });

  it("logs out the authenticated session and rejects subsequent use", async () => {
    const fixture = await createHttpAuthFixture();

    const login = await loginThroughHttp(fixture);

    const logoutResponse = await exports.default.fetch(
      new Request("https://example.test/api/auth/logout", {
        method: "POST",

        headers: {
          Authorization: deviceAuthorization(fixture),

          "X-Auth-Session": login.sessionToken,
        },
      }),
    );

    expect(logoutResponse.status).toBe(200);

    expect(await logoutResponse.json()).toEqual({
      ok: true,
    });

    const reuseResponse = await exports.default.fetch(
      new Request("https://example.test/api/auth/session", {
        headers: {
          Authorization: deviceAuthorization(fixture),

          "X-Auth-Session": login.sessionToken,
        },
      }),
    );

    expect(reuseResponse.status).toBe(401);

    expect(await reuseResponse.json()).toMatchObject({
      ok: false,
      error: "invalid_auth_session",
    });
  });
});
