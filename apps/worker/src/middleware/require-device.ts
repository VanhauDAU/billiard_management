import {
  createMiddleware
} from 'hono/factory'

import type {
  AppEnv
} from '../types/app-env'

import {
  parseDeviceAuthorization
} from '../security/device-credential'

import {
  authenticateDevice
} from '../services/device-service'

export const requireDevice =
  createMiddleware<AppEnv>(
    async (c, next) => {
      const authorization =
        c.req.header('Authorization')

      const credential =
        parseDeviceAuthorization(
          authorization
        )

      if (!credential) {
        c.header(
          'WWW-Authenticate',
          'Device'
        )

        return c.json(
          {
            ok: false,
            error: 'device_auth_required'
          },
          401
        )
      }

      const result =
        await authenticateDevice(
          c.env.DB,
          credential.deviceId,
          credential.secret
        )

      if (!result.ok) {
        if (
          result.error ===
          'invalid_device_credential'
        ) {
          return c.json(
            {
              ok: false,
              error:
                'invalid_device_credential'
            },
            401
          )
        }

        return c.json(
          {
            ok: false,
            error: result.error
          },
          403
        )
      }

      c.set(
        'deviceContext',
        result.context
      )

      await next()
    }
  )