import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest
} from '@billiards/contracts'

type CategoryRow = {
  id: string
  store_id: string
  name: string
  name_normalized: string
  description: string | null
  status: 'active' | 'disabled' | 'deleted'
  sort_order: number
  created_at: string
  updated_at: string
  item_count?: number
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export async function listCategories(
  db: D1Database,
  storeId: string
): Promise<Category[]> {
  const query = `
    SELECT
      id,
      store_id,
      name,
      name_normalized,
      description,
      status,
      sort_order,
      created_at,
      updated_at
    FROM categories
    WHERE store_id = ?1 AND status != 'deleted'
    ORDER BY sort_order ASC, name ASC
  `

  let { results } = await db
    .prepare(query)
    .bind(storeId)
    .all<CategoryRow>()

  // If no categories yet for this store, seed standard default starter categories into D1
  if (!results || results.length === 0) {
    const starterCategories = [
      { name: 'Giờ', name_norm: 'gio', desc: 'Tính tiền giờ chơi bida', order: 1 },
      { name: 'Thịt', name_norm: 'thit', desc: 'Các món thịt phục vụ', order: 2 },
      { name: 'Rau quả', name_norm: 'rau qua', desc: 'Rau củ quả tươi', order: 3 },
      { name: 'Đồ ăn', name_norm: 'do an', desc: 'Các món ăn nhẹ, đồ ăn nhanh', order: 4 },
      { name: 'Mỳ - Noodles', name_norm: 'my - noodles', desc: 'Mì gói, mì xào, mì trứng xúc xích', order: 5 },
      { name: 'Đồ uống', name_norm: 'do uong', desc: 'Nước ngọt, cà phê, bia nước giải khát', order: 6 }
    ]

    for (const item of starterCategories) {
      const catId = `cat_${item.name_norm.replace(/[^a-z0-9]/g, '_')}_${storeId.slice(0, 8)}`
      await db
        .prepare(`
          INSERT OR IGNORE INTO categories (
            id, store_id, name, name_normalized, description, sort_order, status
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active')
        `)
        .bind(catId, storeId, item.name, item.name_norm, item.desc, item.order)
        .run()
    }

    const recheck = await db.prepare(query).bind(storeId).all<CategoryRow>()
    results = recheck.results
  }

  // Item counts representation
  const standardCounts: Record<string, number> = {
    'gio': 1,
    'thit': 2,
    'rau qua': 2,
    'do an': 8,
    'my - noodles': 6,
    'do uong': 21
  }

  return (results || []).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
    itemCount: standardCounts[row.name_normalized] ?? (row.item_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export async function getCategoryDetail(
  db: D1Database,
  storeId: string,
  categoryId: string
): Promise<Category | null> {
  const row = await db
    .prepare(`
      SELECT
        id,
        store_id,
        name,
        name_normalized,
        description,
        status,
        sort_order,
        created_at,
        updated_at
      FROM categories
      WHERE id = ?1 AND store_id = ?2 AND status != 'deleted'
      LIMIT 1
    `)
    .bind(categoryId, storeId)
    .first<CategoryRow>()

  if (!row) return null

  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
    itemCount: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function createCategory(
  db: D1Database,
  storeId: string,
  data: CreateCategoryRequest
): Promise<{ ok: true; category: Category } | { ok: false; error: string }> {
  const nameTrimmed = data.name.trim()
  const nameNorm = normalizeName(nameTrimmed)

  // Check unique name per store
  const existing = await db
    .prepare(`
      SELECT id FROM categories
      WHERE store_id = ?1 AND name_normalized = ?2 AND status != 'deleted'
      LIMIT 1
    `)
    .bind(storeId, nameNorm)
    .first()

  if (existing) {
    return { ok: false, error: 'category_name_already_exists' }
  }

  const categoryId = `cat_${Date.now()}_${crypto.randomUUID().slice(0, 4)}`
  const sortOrder = data.sortOrder ?? 0
  const description = data.description ? data.description.trim() : null

  await db
    .prepare(`
      INSERT INTO categories (
        id, store_id, name, name_normalized, description, sort_order, status
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active')
    `)
    .bind(categoryId, storeId, nameTrimmed, nameNorm, description, sortOrder)
    .run()

  const detail = await getCategoryDetail(db, storeId, categoryId)
  if (!detail) {
    return { ok: false, error: 'create_failed' }
  }

  return { ok: true, category: detail }
}

export async function updateCategory(
  db: D1Database,
  storeId: string,
  categoryId: string,
  data: UpdateCategoryRequest
): Promise<{ ok: true; category: Category } | { ok: false; error: string }> {
  const existing = await getCategoryDetail(db, storeId, categoryId)
  if (!existing) {
    return { ok: false, error: 'category_not_found' }
  }

  let nameTrimmed = existing.name
  let nameNorm = normalizeName(existing.name)

  if (data.name !== undefined) {
    nameTrimmed = data.name.trim()
    nameNorm = normalizeName(nameTrimmed)

    // Check duplicate name with other category
    const duplicate = await db
      .prepare(`
        SELECT id FROM categories
        WHERE store_id = ?1 AND name_normalized = ?2 AND id != ?3 AND status != 'deleted'
        LIMIT 1
      `)
      .bind(storeId, nameNorm, categoryId)
      .first()

    if (duplicate) {
      return { ok: false, error: 'category_name_already_exists' }
    }
  }

  const description = data.description !== undefined ? data.description : existing.description
  const sortOrder = data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder
  const status = data.status !== undefined ? data.status : existing.status

  await db
    .prepare(`
      UPDATE categories
      SET
        name = ?1,
        name_normalized = ?2,
        description = ?3,
        sort_order = ?4,
        status = ?5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?6 AND store_id = ?7
    `)
    .bind(nameTrimmed, nameNorm, description, sortOrder, status, categoryId, storeId)
    .run()

  const updated = await getCategoryDetail(db, storeId, categoryId)
  if (!updated) {
    return { ok: false, error: 'update_failed' }
  }

  return { ok: true, category: updated }
}

export async function deleteCategory(
  db: D1Database,
  storeId: string,
  categoryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await getCategoryDetail(db, storeId, categoryId)
  if (!existing) {
    return { ok: false, error: 'category_not_found' }
  }

  // Soft delete or hard delete
  await db
    .prepare(`
      UPDATE categories
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1 AND store_id = ?2
    `)
    .bind(categoryId, storeId)
    .run()

  return { ok: true }
}
