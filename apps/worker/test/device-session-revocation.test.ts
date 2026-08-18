import { env } from "cloudflare:workers";

import { describe, expect, it } from "vitest";

import { sha256Hex } from "../src/security/device-credential";
import { activateDevice } from "../src/services/device-service";

function randomActivationToken(): string {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")}`;
}

async function seedActivationToken(
  storeId: string,
  rawToken: string,
): Promise<void> {
  const tokenHash = await sha256Hex(rawToken);

  await env.DB.prepare(
    `
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
    `,
  )
    .bind(crypto.randomUUID(), storeId, tokenHash)
    .run();
}

async function seedStoreActor(storeId: string): Promise<{
  userId: string;
  membershipId: string;
}> {
  const roleId = `role-${crypto.randomUUID()}`;
  const userId = `user-${crypto.randomUUID()}`;
  const membershipId = `membership-${crypto.randomUUID()}`;

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
    .bind(storeId, `Store ${storeId}`, `store-${crypto.randomUUID()}`)
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
    .bind(roleId, storeId, `cashier-${crypto.randomUUID()}`)
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
          'Nhân viên test',
          'active'
        )
      `,
    ).bind(userId, storeId, `employee-${crypto.randomUUID()}`),

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

  return {
    userId,
    membershipId,
  };
}

async function insertAuthSession(input: {
  storeId: string;
  userId: string;
  membershipId: string;
  deviceId: string;
  tokenHash: string;
}): Promise<string> {
  const sessionId = crypto.randomUUID();

  await env.DB.prepare(
    `
      INSERT INTO auth_sessions (
        id,
        store_id,
        user_id,
        membership_id,
        device_id,
        session_token_hash,
        expires_at,
        created_at
      )
      VALUES (
        ?1,
        ?2,
        ?3,
        ?4,
        ?5,
        ?6,
        datetime('now', '+12 hours'),
        CURRENT_TIMESTAMP
      )
    `,
  )
    .bind(
      sessionId,
      input.storeId,
      input.userId,
      input.membershipId,
      input.deviceId,
      input.tokenHash,
    )
    .run();

  return sessionId;
}

describe("Device reactivation AuthSession invariants", () => {
  it("revokes existing Device sessions and a replayed token cannot revoke a newer session", async () => {
    const storeId = `store-${crypto.randomUUID()}`;
    const installationId = crypto.randomUUID();

    const actor = await seedStoreActor(storeId);

    const firstActivationToken = randomActivationToken();
    await seedActivationToken(storeId, firstActivationToken);

    const firstActivation = await activateDevice(env.DB, {
      activationToken: firstActivationToken,
      installationId,
      name: "POS Test",
      deviceType: "desktop_pos",
      platform: "windows",
      appVersion: "0.0.0",
    });

    expect(firstActivation.ok).toBe(true);

    if (!firstActivation.ok) {
      throw new Error(firstActivation.error);
    }

    const oldSessionId = await insertAuthSession({
      storeId,
      userId: actor.userId,
      membershipId: actor.membershipId,
      deviceId: firstActivation.value.deviceId,
      tokenHash: "a".repeat(64),
    });

    const secondActivationToken = randomActivationToken();
    await seedActivationToken(storeId, secondActivationToken);

    const secondActivation = await activateDevice(env.DB, {
      activationToken: secondActivationToken,
      installationId,
      name: "POS Test",
      deviceType: "desktop_pos",
      platform: "windows",
      appVersion: "0.0.1",
    });

    expect(secondActivation.ok).toBe(true);

    if (!secondActivation.ok) {
      throw new Error(secondActivation.error);
    }

    expect(secondActivation.value.deviceId).toBe(
      firstActivation.value.deviceId,
    );

    const oldSession = await env.DB.prepare(
      `
        SELECT
          revoked_at,
          revocation_reason
        FROM auth_sessions
        WHERE id = ?1
        LIMIT 1
      `,
    )
      .bind(oldSessionId)
      .first<{
        revoked_at: string | null;
        revocation_reason: string | null;
      }>();

    expect(oldSession?.revoked_at).not.toBeNull();
    expect(oldSession?.revocation_reason).toBe("device_reactivated");

    const currentSessionId = await insertAuthSession({
      storeId,
      userId: actor.userId,
      membershipId: actor.membershipId,
      deviceId: secondActivation.value.deviceId,
      tokenHash: "b".repeat(64),
    });

    const replay = await activateDevice(env.DB, {
      activationToken: secondActivationToken,
      installationId,
      name: "POS Test",
      deviceType: "desktop_pos",
      platform: "windows",
      appVersion: "0.0.2",
    });

    expect(replay).toMatchObject({
      ok: false,
      error: "invalid_activation_token",
    });

    const currentSession = await env.DB.prepare(
      `
        SELECT
          revoked_at,
          revocation_reason
        FROM auth_sessions
        WHERE id = ?1
        LIMIT 1
      `,
    )
      .bind(currentSessionId)
      .first<{
        revoked_at: string | null;
        revocation_reason: string | null;
      }>();

    expect(currentSession).not.toBeNull();
    expect(currentSession?.revoked_at).toBeNull();
    expect(currentSession?.revocation_reason).toBeNull();
  });
});
