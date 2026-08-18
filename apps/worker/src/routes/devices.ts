import { Hono } from 'hono'

import {
  ActivateDeviceRequestSchema
} from '@billiards/contracts'

import type {
  AppEnv
} from '../types/app-env'

import {
  activateDevice
} from '../services/device-service'

export const deviceRoutes =
  new Hono<AppEnv>()

deviceRoutes.post(
  '/activate',
  async (c) => {
    let body: unknown

    try {
      body = await c.req.json()
    } catch {
      return c.json(
        {
          ok: false,
          error: 'invalid_json'
        },
        400
      )
    }

    const parsed =
      ActivateDeviceRequestSchema
        .safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: 'invalid_request'
        },
        400
      )
    }

    const result =
      await activateDevice(
        c.env.DB,
        parsed.data
      )

    if (!result.ok) {
      if (
        result.error ===
        'invalid_activation_token'
      ) {
        return c.json(
          {
            ok: false,
            error:
              'invalid_activation_token'
          },
          401
        )
      }

      if (
        result.error ===
        'device_activation_conflict'
      ) {
        return c.json(
          {
            ok: false,
            error:
              'device_activation_conflict'
          },
          409
        )
      }

      return c.json(
        {
          ok: false,
          error:
            'device_activation_unavailable'
        },
        503
      )
    }

    return c.json(
      result.value,
      201
    )
  }
)
