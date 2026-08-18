import {
  createMiddleware
} from 'hono/factory'

import type {
  PermissionKey
} from '@billiards/contracts'

import type {
  AppEnv
} from '../types/app-env'

import {
  resolvePermissionContext
} from '../services/permission-service'


export function requirePermission(
  permission:
    PermissionKey
) {
  return createMiddleware<AppEnv>(
    async (
      c,
      next
    ) => {
      /*
       * requireAuthSession MUST execute
       * before this middleware.
       *
       * authContext comes only from
       * trusted server-side session
       * authentication.
       */
      const authContext =
        c.get(
          'authContext'
        )


      const result =
        await resolvePermissionContext(
          c.env.DB,
          authContext
        )


      if (!result.ok) {
        if (
          result.error ===
            'actor_inactive'
        ) {
          return c.json(
            {
              ok: false,

              error:
                'invalid_auth_session'
            },
            401
          )
        }


        return c.json(
          {
            ok: false,

            error:
              'authorization_unavailable'
          },
          503
        )
      }


      if (
        !result.context
          .permissions
          .has(permission)
      ) {
        return c.json(
          {
            ok: false,

            error:
              'permission_denied'
          },
          403
        )
      }


      c.set(
        'permissionContext',
        result.context
      )


      await next()
    }
  )
}