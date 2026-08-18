import {
  createMiddleware
} from 'hono/factory'

import type {
  AppEnv
} from '../types/app-env'

import {
  safeHashEqual
} from '../security/device-credential'

const MIN_SYSTEM_TOKEN_LENGTH = 32

export const requireSystemDiagnostics =
  createMiddleware<AppEnv>(
    async (c, next) => {
      const expected =
        c.env.SYSTEM_DIAGNOSTICS_TOKEN

      if (
        !expected ||
        expected.length <
          MIN_SYSTEM_TOKEN_LENGTH
      ) {
        return c.json(
          {
            ok: false,
            error: 'not_found'
          },
          404
        )
      }

      const authorization =
        c.req.header('Authorization')

      if (!authorization) {
        c.header(
          'WWW-Authenticate',
          'Bearer'
        )

        return c.json(
          {
            ok: false,
            error:
              'system_auth_required'
          },
          401
        )
      }

      const separator =
        authorization.indexOf(' ')

      if (separator <= 0) {
        return c.json(
          {
            ok: false,
            error:
              'invalid_system_credential'
          },
          401
        )
      }

      const scheme = authorization
        .slice(0, separator)
        .toLowerCase()

      const received = authorization
        .slice(separator + 1)
        .trim()

      if (
        scheme !== 'bearer' ||
        !received ||
        !safeHashEqual(
          received,
          expected
        )
      ) {
        return c.json(
          {
            ok: false,
            error:
              'invalid_system_credential'
          },
          401
        )
      }

      await next()
    }
  )
