import { Hono } from 'hono'

import {
  PasswordLoginRequestSchema,
  PinLoginRequestSchema,
  VerifyPinRequestSchema
} from '@billiards/contracts'

import type {
  LogoutResponse,
  PermissionContextResponse
} from '@billiards/contracts'

import type { AppEnv } from '../types/app-env'

import { requireDevice } from '../middleware/require-device'
import { requireAuthSession } from '../middleware/require-auth-session'

import {
  authenticateEmployeePin,
  listEmployeesForDevice,
  loginWithPassword,
  revokeAuthSession,
  verifyUserPin
} from '../services/auth-service'

import {
  resolvePermissionContext
} from '../services/permission-service'

export const authRoutes = new Hono<AppEnv>()

// Explicitly prevent caching on all auth endpoints
authRoutes.use('*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
})

// =========================================================
// PASSWORD LOGIN (Owner, Manager, Staff)
// POST /api/auth/login
// =========================================================

authRoutes.post('/login', async (c) => {
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const parsed = PasswordLoginRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid_request', details: parsed.error.issues }, 400)
  }

  const result = await loginWithPassword(c.env.DB, parsed.data)

  if (result.ok) {
    return c.json(result.value, 200)
  }

  if (result.error === 'invalid_credentials') {
    return c.json({ ok: false, error: 'invalid_credentials' }, 401)
  }

  if (result.error === 'user_disabled') {
    return c.json({ ok: false, error: 'user_disabled' }, 403)
  }

  if (result.error === 'role_mismatch') {
    return c.json({ ok: false, error: 'role_mismatch' }, 403)
  }

  if (result.error === 'store_inactive') {
    return c.json({ ok: false, error: 'store_inactive' }, 403)
  }

  return c.json({ ok: false, error: 'authentication_unavailable' }, 503)
})

// =========================================================
// VERIFY 4-DIGIT PIN (For high-privilege in-app actions)
// POST /api/auth/verify-pin
// =========================================================

authRoutes.post('/verify-pin', requireAuthSession, async (c) => {
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const parsed = VerifyPinRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid_request' }, 400)
  }

  const authContext = c.get('authContext')
  const result = await verifyUserPin(c.env.DB, authContext.storeId, authContext.actorId, parsed.data.pin)

  if (result.ok) {
    return c.json({ ok: true }, 200)
  }

  if (result.error === 'invalid_pin') {
    return c.json({ ok: false, error: 'invalid_pin' }, 401)
  }

  if (result.error === 'pin_not_set') {
    return c.json({ ok: false, error: 'pin_not_set' }, 409)
  }

  return c.json({ ok: false, error: 'verification_unavailable' }, 503)
})

// =========================================================
// DEVICE EMPLOYEE LIST & PIN LOGIN (DEVICE CONTEXT BOUND)
// =========================================================

authRoutes.get('/employees', requireDevice, async (c) => {
  const deviceContext = c.get('deviceContext')
  const result = await listEmployeesForDevice(c.env.DB, deviceContext)
  return c.json(result, 200)
})

authRoutes.post('/pin', requireDevice, async (c) => {
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const parsed = PinLoginRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid_request' }, 400)
  }

  const deviceContext = c.get('deviceContext')
  const result = await authenticateEmployeePin(c.env.DB, deviceContext, parsed.data)

  if (result.ok) {
    return c.json(result.value, 200)
  }

  if (result.error === 'employee_not_available' || result.error === 'invalid_pin') {
    return c.json({ ok: false, error: 'invalid_employee_or_pin' }, 401)
  }

  if (result.error === 'pin_not_configured') {
    return c.json({ ok: false, error: 'pin_not_configured' }, 409)
  }

  if (result.error === 'pin_locked') {
    const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterSeconds ?? 1))
    c.header('Retry-After', String(retryAfterSeconds))
    return c.json({ ok: false, error: 'pin_locked', retryAfterSeconds }, 429)
  }

  return c.json({ ok: false, error: 'authentication_unavailable' }, 503)
})

// =========================================================
// SESSION VIEW
// GET /api/auth/session
// =========================================================

authRoutes.get('/session', requireAuthSession, (c) => {
  return c.json(c.get('authSession'), 200)
})

// =========================================================
// PERMISSION CONTEXT
// GET /api/auth/permissions
// =========================================================

authRoutes.get('/permissions', requireAuthSession, async (c) => {
  const authContext = c.get('authContext')
  const result = await resolvePermissionContext(c.env.DB, authContext)

  if (!result.ok) {
    if (result.error === 'actor_inactive') {
      return c.json({ ok: false, error: 'invalid_auth_session' }, 401)
    }

    return c.json({ ok: false, error: 'authorization_unavailable' }, 503)
  }

  const response: PermissionContextResponse = {
    permissions: Array.from(result.context.permissions).sort()
  }

  return c.json(response, 200)
})

// =========================================================
// LOGOUT
// POST /api/auth/logout
// =========================================================

authRoutes.post('/logout', requireAuthSession, async (c) => {
  const authContext = c.get('authContext')
  const revoked = await revokeAuthSession(c.env.DB, authContext, 'logout')

  if (!revoked) {
    return c.json({ ok: false, error: 'logout_unavailable' }, 503)
  }

  const response: LogoutResponse = {
    ok: true
  }

  return c.json(response, 200)
})
