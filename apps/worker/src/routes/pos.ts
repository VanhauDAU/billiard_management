import {
  Hono
} from 'hono'

import {
  TableCommandApiResponseSchema,
  TableConfigurationResponseSchema,
  TableManagementCommandSchema
} from '@billiards/contracts'

import type {
  TableCommandApiResponse
} from '@billiards/contracts'

import type {
  AppEnv
} from '../types/app-env'

import {
  requireDevice
} from '../middleware/require-device'

import {
  requireAuthSession
} from '../middleware/require-auth-session'

import {
  requirePermission
} from '../middleware/require-permission'


export const posRoutes =
  new Hono<AppEnv>()


/*
 * Every POS route requires a trusted Device.
 */
posRoutes.use(
  '*',
  requireDevice
)


/*
 * Operational POS responses must not be
 * cached by browsers/proxies.
 */
posRoutes.use(
  '/tables/*',

  async (
    c,
    next
  ) => {
    c.header(
      'Cache-Control',
      'no-store'
    )

    await next()
  }
)


/*
 * Existing Device context endpoint.
 */
posRoutes.get(
  '/context',

  (c) => {
    return c.json(
      c.get(
        'deviceContext'
      )
    )
  }
)


function getCommandHttpStatus(
  result:
    TableCommandApiResponse
): 200 | 404 | 409 {
  if (
    result.ok
  ) {
    return 200
  }


  if (
    result.error ===
      'table_type_not_found' ||

    result.error ===
      'table_not_found'
  ) {
    return 404
  }


  return 409
}


/*
 * =========================================================
 * TABLE CONFIGURATION
 * =========================================================
 *
 * GET /api/pos/tables/configuration
 *
 * Device + AuthSession + table.view
 */
posRoutes.get(
  '/tables/configuration',

  requireAuthSession,

  requirePermission(
    'table.view'
  ),

  async (
    c
  ) => {
    const deviceContext =
      c.get(
        'deviceContext'
      )

    const authContext =
      c.get(
        'authContext'
      )


    /*
     * Defensive trusted-context invariant.
     *
     * The authenticated session must belong
     * to the same Store and Device that
     * authenticated this HTTP request.
     */
    if (
      authContext.storeId !==
        deviceContext.store.id ||

      authContext.deviceId !==
        deviceContext.device.id
    ) {
      console.error(
        'Trusted POS context mismatch',
        {
          authStoreId:
            authContext.storeId,

          deviceStoreId:
            deviceContext.store.id,

          authDeviceId:
            authContext.deviceId,

          deviceId:
            deviceContext.device.id
        }
      )


      return c.json(
        {
          ok: false,
          error:
            'table_service_unavailable'
        },
        503
      )
    }


    try {
      /*
       * Store identity comes exclusively from
       * trusted AuthContext.
       *
       * The client never chooses the Store DO.
       */
      const stub =
        c.env.STORE_DO
          .getByName(
            authContext.storeId
          )


      const value =
        await stub
          .getTableConfiguration(
            authContext.storeId
          )


      /*
       * Validate the RPC boundary again.
       *
       * Corrupt/invalid DO output must fail
       * closed rather than reach the client.
       */
      const parsed =
        TableConfigurationResponseSchema
          .safeParse(
            value
          )


      if (
        !parsed.success
      ) {
        console.error(
          'Invalid table configuration RPC response:',
          parsed.error
        )


        return c.json(
          {
            ok: false,
            error:
              'table_service_unavailable'
          },
          503
        )
      }


      return c.json(
        parsed.data,
        200
      )
    } catch (
      error
    ) {
      console.error(
        'Table configuration RPC failed:',
        error
      )


      return c.json(
        {
          ok: false,
          error:
            'table_service_unavailable'
        },
        503
      )
    }
  }
)


/*
 * =========================================================
 * TABLE COMMAND
 * =========================================================
 *
 * POST /api/pos/tables/commands
 *
 * Device + AuthSession + table.manage
 */
posRoutes.post(
  '/tables/commands',

  requireAuthSession,

  requirePermission(
    'table.manage'
  ),

  async (
    c
  ) => {
    const deviceContext =
      c.get(
        'deviceContext'
      )

    const authContext =
      c.get(
        'authContext'
      )


    if (
      authContext.storeId !==
        deviceContext.store.id ||

      authContext.deviceId !==
        deviceContext.device.id
    ) {
      console.error(
        'Trusted POS context mismatch',
        {
          authStoreId:
            authContext.storeId,

          deviceStoreId:
            deviceContext.store.id,

          authDeviceId:
            authContext.deviceId,

          deviceId:
            deviceContext.device.id
        }
      )


      return c.json(
        {
          ok: false,
          error:
            'table_service_unavailable'
        },
        503
      )
    }


    let body:
      unknown


    try {
      body =
        await c.req.json()
    } catch {
      return c.json(
        {
          ok: false,
          error:
            'invalid_json'
        },
        400
      )
    }


    /*
     * Client may only submit the business
     * command contract.
     *
     * storeId / actorId / deviceId are NOT
     * accepted from Renderer/client.
     */
    const command =
      TableManagementCommandSchema
        .safeParse(
          body
        )


    if (
      !command.success
    ) {
      return c.json(
        {
          ok: false,
          error:
            'invalid_table_command'
        },
        400
      )
    }


    try {
      const stub =
        c.env.STORE_DO
          .getByName(
            authContext.storeId
          )


      const result =
        await stub
          .executeTableCommand(
            {
              storeId:
                authContext.storeId,

              actorId:
                authContext.actorId,

              deviceId:
                authContext.deviceId
            },

            command.data
          )


      /*
       * Only public command results may cross
       * the HTTP boundary.
       *
       * Internal DO errors such as
       * invalid_execution_context are treated
       * as service/invariant failures.
       */
      const parsed =
        TableCommandApiResponseSchema
          .safeParse(
            result
          )


      if (
        !parsed.success
      ) {
        console.error(
          'Invalid table command RPC response:',
          result
        )


        return c.json(
          {
            ok: false,
            error:
              'table_service_unavailable'
          },
          503
        )
      }


      return c.json(
        parsed.data,

        getCommandHttpStatus(
          parsed.data
        )
      )
    } catch (
      error
    ) {
      console.error(
        'Table command RPC failed:',
        error
      )


      return c.json(
        {
          ok: false,
          error:
            'table_service_unavailable'
        },
        503
      )
    }
  }
)