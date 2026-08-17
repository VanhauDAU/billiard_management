import { Hono } from 'hono'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (c) => {
  return c.json({
    ok: true,
    service: 'billiards-api',
    message: 'Billiards API is running'
  })
})

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: 'billiards-api'
  })
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

export default app