import { Hono } from 'hono'

import type {
  AppEnv
} from '../types/app-env'

import {
  requireDevice
} from '../middleware/require-device'

export const posRoutes =
  new Hono<AppEnv>()

posRoutes.use(
  '*',
  requireDevice
)

posRoutes.get(
  '/context',
  (c) => {
    return c.json(
      c.get('deviceContext')
    )
  }
)