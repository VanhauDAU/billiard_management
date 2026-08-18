import { Hono } from 'hono'

import {
  CreateStaffRequestSchema,
  UpdateStaffRequestSchema
} from '@billiards/contracts'

import type { AppEnv } from '../types/app-env'
import { requireAuthSession } from '../middleware/require-auth-session'
import {
  createStaffMember,
  deleteStaffMember,
  listStaffMembers,
  updateStaffMember
} from '../services/staff-service'

export const staffRoutes = new Hono<AppEnv>()

// All staff management routes require valid authenticated session
staffRoutes.use('*', requireAuthSession)

// =========================================================
// LIST STAFF
// GET /api/staff
// =========================================================
staffRoutes.get('/', async (c) => {
  const authContext = c.get('authContext')
  const result = await listStaffMembers(c.env.DB, authContext.storeId)
  return c.json(result, 200)
})

// =========================================================
// CREATE STAFF
// POST /api/staff
// =========================================================
staffRoutes.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const parsed = CreateStaffRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid_request', details: parsed.error.issues }, 400)
  }

  const authContext = c.get('authContext')
  const result = await createStaffMember(c.env.DB, authContext.storeId, parsed.data)

  if (!result.ok) {
    if (result.error === 'username_already_exists') {
      return c.json({ ok: false, error: 'username_already_exists', message: 'Tên đăng nhập đã tồn tại trong quán' }, 409)
    }
    return c.json({ ok: false, error: 'creation_failed', message: 'Không thể tạo nhân viên' }, 500)
  }

  return c.json(result, 201)
})

// =========================================================
// UPDATE STAFF
// PUT /api/staff/:id
// =========================================================
staffRoutes.put('/:id', async (c) => {
  const staffId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const parsed = UpdateStaffRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid_request', details: parsed.error.issues }, 400)
  }

  const authContext = c.get('authContext')
  const result = await updateStaffMember(c.env.DB, authContext.storeId, staffId, parsed.data)

  if (!result.ok) {
    if (result.error === 'staff_not_found') {
      return c.json({ ok: false, error: 'staff_not_found' }, 404)
    }
    return c.json({ ok: false, error: 'update_failed' }, 500)
  }

  return c.json(result, 200)
})

// =========================================================
// DELETE STAFF
// DELETE /api/staff/:id
// =========================================================
staffRoutes.delete('/:id', async (c) => {
  const staffId = c.req.param('id')
  const authContext = c.get('authContext')

  const result = await deleteStaffMember(c.env.DB, authContext.storeId, staffId)

  if (!result.ok) {
    if (result.error === 'cannot_delete_owner') {
      return c.json({ ok: false, error: 'cannot_delete_owner', message: 'Không thể xóa tài khoản Chủ quán' }, 403)
    }
    return c.json({ ok: false, error: 'delete_failed' }, 500)
  }

  return c.json({ ok: true }, 200)
})
