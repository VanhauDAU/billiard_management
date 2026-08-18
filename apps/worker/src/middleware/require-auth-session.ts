import {
  createMiddleware
} from 'hono/factory'

import type {
  AppEnv
} from '../types/app-env'

import {
  authenticateSession
} from '../services/auth-service'


export const requireAuthSession =
  createMiddleware<AppEnv>(
    async (c, next) => {
      const sessionToken =
        c.req.header(
          'X-Auth-Session'
        )

      if (!sessionToken) {
        return c.json(
          {
            ok: false,
            error:
              'auth_session_required'
          },
          401
        )
      }

      const deviceContext =
        c.get(
          'deviceContext'
        )

      const result =
        await authenticateSession(
          c.env.DB,
          deviceContext,
          sessionToken
        )

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            error:
              'invalid_auth_session'
          },
          401
        )
      }

      c.set(
        'authContext',
        result.context
      )

      c.set(
        'authSession',
        result.session
      )

      await next()
    }
  )