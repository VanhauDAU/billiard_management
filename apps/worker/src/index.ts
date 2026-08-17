import { Hono } from 'hono'

const app = new Hono()

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

export default app