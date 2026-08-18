import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types/app-env'
import { authenticateSession } from '../services/auth-service'
import { parseDeviceAuthorization } from '../security/device-credential'
import { authenticateDevice } from '../services/device-service'

export const requireAuthSession = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  let sessionToken = c.req.header('X-Auth-Session')

  if (!sessionToken && authHeader?.startsWith('Bearer ')) {
    sessionToken = authHeader.slice(7).trim()
  }

  if (!sessionToken) {
    return c.json(
      {
        ok: false,
        error: 'auth_session_required'
      },
      401
    )
  }

  let deviceContext = c.get('deviceContext')

  // If request contains Device authorization header, authenticate device first
  if (!deviceContext && authHeader?.startsWith('Device ')) {
    const credential = parseDeviceAuthorization(authHeader)
    if (credential) {
      const devResult = await authenticateDevice(c.env.DB, credential.deviceId, credential.secret)
      if (devResult.ok) {
        deviceContext = devResult.context
        c.set('deviceContext', devResult.context)
      } else {
        return c.json(
          {
            ok: false,
            error: 'invalid_device_credential'
          },
          401
        )
      }
    }
  }

  const result = await authenticateSession(c.env.DB, deviceContext, sessionToken)

  if (!result.ok) {
    return c.json(
      {
        ok: false,
        error: 'invalid_auth_session'
      },
      401
    )
  }

  c.set('authContext', result.context)
  c.set('authSession', result.session)

  await next()
})