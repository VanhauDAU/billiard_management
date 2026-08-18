import { Hono } from 'hono'

import {
  CreateCategoryRequestSchema,
  UpdateCategoryRequestSchema
} from '@billiards/contracts'

import type { AppEnv } from '../types/app-env'
import { requireAuthSession } from '../middleware/require-auth-session'
import {
  createCategory,
  deleteCategory,
  getCategoryDetail,
  listCategories,
  updateCategory
} from '../services/category-service'

export const categoryRoutes = new Hono<AppEnv>()

// All category management routes require valid authenticated session
categoryRoutes.use('*', requireAuthSession)

// =========================================================
// LIST CATEGORIES
// GET /api/categories
// =========================================================
categoryRoutes.get('/', async (c) => {
  const authContext = c.get('authContext')
  const categories = await listCategories(c.env.DB, authContext.storeId)
  return c.json({ categories }, 200)
})

// =========================================================
// GET CATEGORY DETAIL
// GET /api/categories/:id
// =========================================================
categoryRoutes.get('/:id', async (c) => {
  const authContext = c.get('authContext')
  const categoryId = c.req.param('id')
  const category = await getCategoryDetail(c.env.DB, authContext.storeId, categoryId)

  if (!category) {
    return c.json({ ok: false, error: 'category_not_found', message: 'Không tìm thấy danh mục' }, 404)
  }

  return c.json({ ok: true, category }, 200)
})

// =========================================================
// CREATE CATEGORY
// POST /api/categories
// =========================================================
categoryRoutes.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const parsed = CreateCategoryRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid_request', details: parsed.error.issues }, 400)
  }

  const authContext = c.get('authContext')
  const result = await createCategory(c.env.DB, authContext.storeId, parsed.data)

  if (!result.ok) {
    if (result.error === 'category_name_already_exists') {
      return c.json({ ok: false, error: 'category_name_already_exists', message: 'Tên danh mục đã tồn tại trong quán' }, 409)
    }
    return c.json({ ok: false, error: 'creation_failed', message: 'Không thể tạo danh mục' }, 500)
  }

  return c.json(result, 201)
})

// =========================================================
// UPDATE CATEGORY
// PUT /api/categories/:id
// =========================================================
categoryRoutes.put('/:id', async (c) => {
  const categoryId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const parsed = UpdateCategoryRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid_request', details: parsed.error.issues }, 400)
  }

  const authContext = c.get('authContext')
  const result = await updateCategory(c.env.DB, authContext.storeId, categoryId, parsed.data)

  if (!result.ok) {
    if (result.error === 'category_not_found') {
      return c.json({ ok: false, error: 'category_not_found', message: 'Không tìm thấy danh mục' }, 404)
    }
    if (result.error === 'category_name_already_exists') {
      return c.json({ ok: false, error: 'category_name_already_exists', message: 'Tên danh mục bị trùng lặp' }, 409)
    }
    return c.json({ ok: false, error: 'update_failed', message: 'Không thể cập nhật danh mục' }, 500)
  }

  return c.json(result, 200)
})

// =========================================================
// DELETE CATEGORY
// DELETE /api/categories/:id
// =========================================================
categoryRoutes.delete('/:id', async (c) => {
  const categoryId = c.req.param('id')
  const authContext = c.get('authContext')
  const result = await deleteCategory(c.env.DB, authContext.storeId, categoryId)

  if (!result.ok) {
    if (result.error === 'category_not_found') {
      return c.json({ ok: false, error: 'category_not_found', message: 'Không tìm thấy danh mục' }, 404)
    }
    return c.json({ ok: false, error: 'delete_failed', message: 'Không thể xóa danh mục' }, 500)
  }

  return c.json({ ok: true, message: 'Đã xóa danh mục thành công' }, 200)
})
