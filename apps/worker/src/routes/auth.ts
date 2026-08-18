import { Hono } from "hono";

import { PinLoginRequestSchema } from "@billiards/contracts";

import type { LogoutResponse } from "@billiards/contracts";

import type { AppEnv } from "../types/app-env";

import { requireDevice } from "../middleware/require-device";

import { requireAuthSession } from "../middleware/require-auth-session";

import {
  authenticateEmployeePin,
  listEmployeesForDevice,
  revokeAuthSession,
} from "../services/auth-service";

export const authRoutes = new Hono<AppEnv>();

// Authentication responses can contain employee identity metadata or,
// for PIN login, a one-time raw session credential. Keep the entire auth
// surface explicitly non-cacheable, including error responses.
authRoutes.use("*", async (c, next) => {
  await next();

  c.header("Cache-Control", "no-store");
});

// =========================================================
// ALL AUTH ROUTES REQUIRE A TRUSTED DEVICE FIRST
// =========================================================

authRoutes.use("*", requireDevice);

// =========================================================
// EMPLOYEE LIST
//
// Device authenticated.
// Employee session not required yet because this endpoint
// is used by AuthGate to select an employee.
// =========================================================

authRoutes.get("/employees", async (c) => {
  const deviceContext = c.get("deviceContext");

  const result = await listEmployeesForDevice(c.env.DB, deviceContext);

  return c.json(result, 200);
});

// =========================================================
// PIN LOGIN
//
// Device is already trusted.
//
// Client may provide only:
// - employeeId
// - pin
//
// Store and Device are derived from DeviceContext.
// =========================================================

authRoutes.post("/pin", async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        ok: false,
        error: "invalid_json",
      },
      400,
    );
  }

  const parsed = PinLoginRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        ok: false,
        error: "invalid_request",
      },
      400,
    );
  }

  const deviceContext = c.get("deviceContext");

  const result = await authenticateEmployeePin(
    c.env.DB,
    deviceContext,
    parsed.data,
  );

  if (result.ok) {
    return c.json(result.value, 200);
  }

  // Do not reveal whether the employee
  // exists separately from whether the
  // supplied PIN is incorrect.
  if (
    result.error === "employee_not_available" ||
    result.error === "invalid_pin"
  ) {
    return c.json(
      {
        ok: false,
        error: "invalid_employee_or_pin",
      },
      401,
    );
  }

  if (result.error === "pin_not_configured") {
    return c.json(
      {
        ok: false,
        error: "pin_not_configured",
      },
      409,
    );
  }

  if (result.error === "pin_locked") {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(result.retryAfterSeconds ?? 1),
    );

    c.header("Retry-After", String(retryAfterSeconds));

    return c.json(
      {
        ok: false,
        error: "pin_locked",

        retryAfterSeconds,
      },
      429,
    );
  }

  return c.json(
    {
      ok: false,
      error: "authentication_unavailable",
    },
    503,
  );
});

// =========================================================
// SESSION VIEW
//
// Both Device and AuthSession are required.
// =========================================================

authRoutes.get("/session", requireAuthSession, (c) => {
  return c.json(c.get("authSession"), 200);
});

// =========================================================
// LOGOUT
//
// Both Device and AuthSession are required.
// =========================================================

authRoutes.post("/logout", requireAuthSession, async (c) => {
  const authContext = c.get("authContext");

  const revoked = await revokeAuthSession(c.env.DB, authContext, "logout");

  if (!revoked) {
    return c.json(
      {
        ok: false,
        error: "logout_unavailable",
      },
      503,
    );
  }

  const response: LogoutResponse = {
    ok: true,
  };

  return c.json(response, 200);
});
