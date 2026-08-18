import { Hono } from 'hono'
import type {
  AppEnv
} from './types/app-env'

import {
  deviceRoutes
} from './routes/devices'

import {
  posRoutes
} from './routes/pos'
import type { ApiHealthResponse } from '@billiards/contracts'
export { StoreDurableObject } from './durable-objects/store-durable-object'
const app =
  new Hono<AppEnv>()
app.get('/', (c) => {
  return c.json({
    ok: true,
    service: 'billiards-api',
    message: 'Billiards API is running'
  })
})

app.get('/api/health', (c) => {
  const response: ApiHealthResponse = {
    ok: true,
    service: 'billiards-api'
  }

  return c.json(response)
})
app.get('/api/system/db-health', async (c) => {
  try {
    const migration = await c.env.DB
      .prepare(`
        SELECT name
        FROM d1_migrations
        ORDER BY id DESC
        LIMIT 1
      `)
      .first<{ name: string }>()

    return c.json({
      ok: true,
      database: 'd1',
      latestMigration: migration?.name ?? null
    })
  } catch (error) {
    console.error('D1 health check failed:', error)

    return c.json(
      {
        ok: false,
        database: 'd1',
        error: 'database_unavailable'
      },
      503
    )
  }
})
app.get('/api/system/stores/:storeId/do-health', async (c) => {
  const storeId = c.req.param('storeId')

  try {
    const store = await c.env.DB
      .prepare(
        `
          SELECT id, status
          FROM stores
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(storeId)
      .first<{
        id: string
        status: string
      }>()

    if (!store) {
      return c.json(
        {
          ok: false,
          error: 'store_not_found'
        },
        404
      )
    }

    const durableObjectId = c.env.STORE_DO.idFromName(storeId)
    const stub = c.env.STORE_DO.get(durableObjectId)

    const response = await stub.fetch(
      new Request('https://store-do/health', {
        headers: {
          'x-store-id': storeId
        }
      })
    )

    const data = await response.json()

    if (!response.ok) {
      return c.json(
        data as Record<string, unknown>,
        503
      )
    }

    return c.json(
      data as Record<string, unknown>,
      200
    )
  } catch (error) {
    console.error('Store DO gateway health failed:', error)

    return c.json(
      {
        ok: false,
        error: 'store_do_unavailable'
      },
      503
    )
  }
})
app.route(
  '/api/devices',
  deviceRoutes
)

app.route(
  '/api/pos',
  posRoutes
)
export default app