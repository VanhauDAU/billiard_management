import type {
  ActivateDeviceRequest,
  ActivateDeviceResponse,
  DeviceContext,
} from "@billiards/contracts";

import {
  generateDeviceSecret,
  safeHashEqual,
  sha256Hex,
} from "../security/device-credential";

type DeviceAuthRow = {
  device_id: string;
  store_id: string;
  installation_id: string;
  device_name: string;
  device_type: "desktop_pos" | "mobile_pwa";
  platform: "windows" | "macos" | "ios" | "android" | "web";
  app_version: string | null;
  device_status: "pending" | "active" | "revoked";
  credential_hash: string | null;
  store_name: string;
  store_status: "active" | "suspended" | "closed";
  timezone: string;
  locale: string;
  currency: string;
};

export type DeviceAuthResult =
  | {
      ok: true;
      context: DeviceContext;
    }
  | {
      ok: false;
      error:
        | "invalid_device_credential"
        | "device_revoked"
        | "device_inactive"
        | "store_inactive";
    };

export async function authenticateDevice(
  db: D1Database,
  deviceId: string,
  deviceSecret: string,
): Promise<DeviceAuthResult> {
  const row = await db
    .prepare(
      `
      SELECT
        d.id AS device_id,
        d.store_id,
        d.installation_id,
        d.name AS device_name,
        d.device_type,
        d.platform,
        d.app_version,
        d.status AS device_status,
        d.credential_hash,

        s.name AS store_name,
        s.status AS store_status,
        s.timezone,
        s.locale,
        s.currency

      FROM devices d

      INNER JOIN stores s
        ON s.id = d.store_id

      WHERE d.id = ?1

      LIMIT 1
    `,
    )
    .bind(deviceId)
    .first<DeviceAuthRow>();

  if (!row || !row.credential_hash) {
    return {
      ok: false,
      error: "invalid_device_credential",
    };
  }

  const receivedHash = await sha256Hex(deviceSecret);

  if (!safeHashEqual(receivedHash, row.credential_hash)) {
    return {
      ok: false,
      error: "invalid_device_credential",
    };
  }

  if (row.device_status === "revoked") {
    return {
      ok: false,
      error: "device_revoked",
    };
  }

  if (row.device_status !== "active") {
    return {
      ok: false,
      error: "device_inactive",
    };
  }

  if (row.store_status !== "active") {
    return {
      ok: false,
      error: "store_inactive",
    };
  }

  return {
    ok: true,
    context: {
      device: {
        id: row.device_id,
        name: row.device_name,
        installationId: row.installation_id,
        type: row.device_type,
        platform: row.platform,
        appVersion: row.app_version,
      },
      store: {
        id: row.store_id,
        name: row.store_name,
        timezone: row.timezone,
        locale: row.locale,
        currency: row.currency,
      },
    },
  };
}

export type ActivateDeviceResult =
  | {
      ok: true;
      value: ActivateDeviceResponse;
    }
  | {
      ok: false;
      error:
        | "invalid_activation_token"
        | "device_activation_conflict"
        | "device_activation_unavailable";
    };

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("SQLITE_CONSTRAINT");
}

export async function activateDevice(
  db: D1Database,
  input: ActivateDeviceRequest,
): Promise<ActivateDeviceResult> {
  const deviceId = crypto.randomUUID();

  const deviceSecret = generateDeviceSecret();

  const credentialHash = await sha256Hex(deviceSecret);

  const activationHash = await sha256Hex(input.activationToken);

  try {
    const results = await db.batch([
      db
        .prepare(
          `
        INSERT INTO devices (
          id,
          store_id,
          installation_id,
          name,
          device_type,
          platform,
          status,
          app_version,
          credential_hash,
          credential_created_at,
          credential_version,
          registered_at,
          created_at,
          updated_at
        )

        SELECT
          ?1,
          token.store_id,
          ?2,
          ?3,
          ?4,
          ?5,
          'active',
          ?6,
          ?7,
          CURRENT_TIMESTAMP,
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP

        FROM device_activation_tokens token

        INNER JOIN stores store
          ON store.id = token.store_id

        WHERE
          token.token_hash = ?8
          AND token.status = 'active'
          AND token.expires_at > CURRENT_TIMESTAMP
          AND store.status = 'active'

        ON CONFLICT(store_id, installation_id)
        DO UPDATE SET
          name = excluded.name,
          device_type = excluded.device_type,
          platform = excluded.platform,
          status = 'active',
          app_version = excluded.app_version,
          credential_hash =
            excluded.credential_hash,
          credential_created_at =
            CURRENT_TIMESTAMP,
          credential_version =
            devices.credential_version + 1,
          revoked_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      `,
        )
        .bind(
          deviceId,
          input.installationId,
          input.name,
          input.deviceType,
          input.platform,
          input.appVersion ?? null,
          credentialHash,
          activationHash,
        ),

      /*
       * Device credential rotation invalidates all
       * employee AuthSessions bound to that Device.
       *
       * IMPORTANT:
       * Only revoke when the activation token is
       * currently valid and usable. A replayed or
       * expired token must never revoke sessions.
       */
      db
        .prepare(
          `
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
              'device_reactivated'
            )

        WHERE
          revoked_at IS NULL

          AND EXISTS (
            SELECT 1

            FROM devices d

            INNER JOIN device_activation_tokens token
              ON token.store_id =
                d.store_id

            INNER JOIN stores store
              ON store.id =
                token.store_id

            WHERE
              token.token_hash = ?2

              AND token.status = 'active'

              AND token.expires_at >
                CURRENT_TIMESTAMP

              AND store.status = 'active'

              AND d.installation_id =
                ?1

              AND auth_sessions.store_id =
                d.store_id

              AND auth_sessions.device_id =
                d.id
          )
      `,
        )
        .bind(input.installationId, activationHash),

      db
        .prepare(
          `
        UPDATE device_activation_tokens

        SET
          status = 'used',
          used_at = CURRENT_TIMESTAMP,

          used_device_id = (
            SELECT devices.id

            FROM devices

            WHERE
              devices.store_id =
                device_activation_tokens.store_id

              AND devices.installation_id =
                ?1

            LIMIT 1
          )

        WHERE
          token_hash = ?2

          AND status = 'active'

          AND expires_at >
            CURRENT_TIMESTAMP

          AND EXISTS (
            SELECT 1

            FROM stores

            WHERE
              stores.id =
                device_activation_tokens.store_id

              AND stores.status = 'active'
          )
      `,
        )
        .bind(input.installationId, activationHash),
    ]);

    const insertResult = results[0];

    const revokeSessionsResult = results[1];

    const consumeResult = results[2];

    if (!insertResult.success) {
      console.error("Device activation insert failed without throwing");

      return {
        ok: false,
        error: "device_activation_unavailable",
      };
    }

    if (insertResult.meta.changes !== 1) {
      return {
        ok: false,
        error: "invalid_activation_token",
      };
    }

    /*
     * Zero revoked sessions is completely valid:
     * a newly activated Device normally has no
     * AuthSession yet.
     */
    if (!revokeSessionsResult.success) {
      console.error("Device session revocation invariant failed");

      return {
        ok: false,
        error: "device_activation_unavailable",
      };
    }

    if (!consumeResult.success || consumeResult.meta.changes !== 1) {
      console.error("Device activation token consume invariant failed");

      return {
        ok: false,
        error: "device_activation_unavailable",
      };
    }

    const device = await db
      .prepare(
        `
        SELECT
          devices.id,
          devices.store_id,
          devices.device_type,
          devices.platform

        FROM devices

        INNER JOIN device_activation_tokens token
          ON token.store_id =
            devices.store_id

        WHERE
          token.token_hash = ?1
          AND devices.installation_id = ?2

        LIMIT 1
      `,
      )
      .bind(activationHash, input.installationId)
      .first<{
        id: string;
        store_id: string;
        device_type: "desktop_pos" | "mobile_pwa";
        platform: "windows" | "macos" | "ios" | "android" | "web";
      }>();

    if (!device) {
      console.error("Activated device lookup invariant failed");

      return {
        ok: false,
        error: "device_activation_unavailable",
      };
    }

    return {
      ok: true,
      value: {
        deviceId: device.id,
        deviceSecret,
        storeId: device.store_id,
        deviceType: device.device_type,
        platform: device.platform,
      },
    };
  } catch (error) {
    console.error("Device activation failed:", error);

    return {
      ok: false,
      error: isConstraintError(error)
        ? "device_activation_conflict"
        : "device_activation_unavailable",
    };
  }
}
