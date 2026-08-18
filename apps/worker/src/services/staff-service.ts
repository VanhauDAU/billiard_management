import type {
  CreateStaffRequest,
  StaffItem,
  StaffListResponse,
  UpdateStaffRequest
} from '@billiards/contracts'

import { createPasswordHash } from '../security/password-credential'
import { createPinHash } from '../security/pin-credential'

type StaffRow = {
  id: string
  username: string
  display_name: string
  email: string | null
  phone: string | null
  role_code: string
  role_name: string
  status: string
  has_pin: number
  created_at: string
  updated_at: string
}

export async function listStaffMembers(
  db: D1Database,
  storeId: string
): Promise<StaffListResponse> {
  const result = await db
    .prepare(`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.phone,
        r.code AS role_code,
        r.name AS role_name,
        u.status,
        CASE
          WHEN pin.id IS NOT NULL AND pin.status = 'active' THEN 1
          ELSE 0
        END AS has_pin,
        u.created_at,
        u.updated_at
      FROM users u
      INNER JOIN store_memberships m ON m.store_id = u.store_id AND m.user_id = u.id
      INNER JOIN roles r ON r.store_id = u.store_id AND r.id = m.role_id
      LEFT JOIN employee_pin_credentials pin ON pin.store_id = u.store_id AND pin.user_id = u.id
      WHERE u.store_id = ?1
      ORDER BY r.code = 'owner' DESC, r.code = 'manager' DESC, u.created_at DESC
    `)
    .bind(storeId)
    .all<StaffRow>()

  return {
    ok: true,
    staff: result.results.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      phone: row.phone,
      roleCode: row.role_code,
      roleName: row.role_name,
      status: row.status === 'active' ? 'active' : 'disabled',
      hasPin: row.has_pin === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }
}

export async function createStaffMember(
  db: D1Database,
  storeId: string,
  data: CreateStaffRequest
): Promise<
  | { ok: true; staff: StaffItem }
  | { ok: false; error: 'username_already_exists' | 'invalid_role' | 'creation_failed' }
> {
  const normalizedUsername = data.username.trim().toLowerCase()

  try {
    // Check username in store
    const existing = await db
      .prepare(`SELECT id FROM users WHERE store_id = ?1 AND username_normalized = ?2 LIMIT 1`)
      .bind(storeId, normalizedUsername)
      .first<{ id: string }>()

    if (existing) {
      return { ok: false, error: 'username_already_exists' }
    }

    // Resolve role ID
    let role = await db
      .prepare(`SELECT id, code, name FROM roles WHERE store_id = ?1 AND code = ?2 LIMIT 1`)
      .bind(storeId, data.roleCode)
      .first<{ id: string; code: string; name: string }>()

    if (!role) {
      // If role doesn't exist, create it or fallback
      const roleId = `role_${data.roleCode}_${storeId.slice(0, 6)}`
      const roleName = data.roleCode === 'manager' ? 'Quản lý' : data.roleCode === 'cashier' ? 'Thu ngân' : 'Nhân viên phục vụ'
      await db
        .prepare(`
          INSERT OR IGNORE INTO roles (id, store_id, code, name, is_system, status)
          VALUES (?1, ?2, ?3, ?4, 1, 'active')
        `)
        .bind(roleId, storeId, data.roleCode, roleName)
        .run()

      role = { id: roleId, code: data.roleCode, name: roleName }
    }

    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const membershipId = `mem_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const pwdCredId = `pwd_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const pinCredId = `pin_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

    // Hash Password & PIN
    const passwordHashData = await createPasswordHash(data.password)
    const pinHashData = await createPinHash(data.pin)

    // Execute in transaction / batch
    await db.batch([
      // 1. Insert User
      db
        .prepare(`
          INSERT INTO users (id, store_id, username, username_normalized, display_name, email, phone, status)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active')
        `)
        .bind(
          userId,
          storeId,
          data.username.trim(),
          normalizedUsername,
          data.displayName.trim(),
          data.email?.trim() || null,
          data.phone?.trim() || null
        ),

      // 2. Insert Password Credential
      db
        .prepare(`
          INSERT INTO user_password_credentials (
            id, store_id, user_id, password_hash, password_salt, kdf_algorithm, kdf_iterations, status
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active')
        `)
        .bind(
          pwdCredId,
          storeId,
          userId,
          passwordHashData.hash,
          passwordHashData.salt,
          passwordHashData.algorithm,
          passwordHashData.iterations
        ),

      // 3. Insert PIN Credential
      db
        .prepare(`
          INSERT INTO employee_pin_credentials (
            id, store_id, user_id, pin_hash, pin_salt, kdf_algorithm, kdf_iterations, status
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active')
        `)
        .bind(
          pinCredId,
          storeId,
          userId,
          pinHashData.hash,
          pinHashData.salt,
          pinHashData.algorithm,
          pinHashData.iterations
        ),

      // 4. Insert Membership
      db
        .prepare(`
          INSERT INTO store_memberships (id, store_id, user_id, role_id, status)
          VALUES (?1, ?2, ?3, ?4, 'active')
        `)
        .bind(membershipId, storeId, userId, role.id)
    ])

    const now = new Date().toISOString()

    return {
      ok: true,
      staff: {
        id: userId,
        username: data.username.trim(),
        displayName: data.displayName.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        roleCode: role.code,
        roleName: role.name,
        status: 'active',
        hasPin: true,
        createdAt: now,
        updatedAt: now
      }
    }
  } catch (error) {
    console.error('Create staff failed:', error)
    return { ok: false, error: 'creation_failed' }
  }
}

export async function updateStaffMember(
  db: D1Database,
  storeId: string,
  userId: string,
  data: UpdateStaffRequest
): Promise<
  | { ok: true; staff: StaffItem }
  | { ok: false; error: 'staff_not_found' | 'update_failed' }
> {
  try {
    const user = await db
      .prepare(`SELECT id, status FROM users WHERE store_id = ?1 AND id = ?2 LIMIT 1`)
      .bind(storeId, userId)
      .first<{ id: string; status: string }>()

    if (!user) {
      return { ok: false, error: 'staff_not_found' }
    }

    const statements = []

    // 1. Update basic user info
    if (data.displayName || data.email !== undefined || data.phone !== undefined || data.status) {
      statements.push(
        db
          .prepare(`
            UPDATE users
            SET display_name = COALESCE(?3, display_name),
                email = CASE WHEN ?4 IS NOT NULL THEN ?4 ELSE email END,
                phone = CASE WHEN ?5 IS NOT NULL THEN ?5 ELSE phone END,
                status = COALESCE(?6, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE store_id = ?1 AND id = ?2
          `)
          .bind(
            storeId,
            userId,
            data.displayName?.trim() || null,
            data.email !== undefined ? data.email?.trim() || null : null,
            data.phone !== undefined ? data.phone?.trim() || null : null,
            data.status || null
          )
      )
    }

    // 2. Update password if provided
    if (data.password) {
      const pwdData = await createPasswordHash(data.password)
      const pwdId = `pwd_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
      statements.push(
        db
          .prepare(`
            INSERT INTO user_password_credentials (
              id, store_id, user_id, password_hash, password_salt, kdf_algorithm, kdf_iterations, status
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active')
            ON CONFLICT (store_id, user_id) DO UPDATE SET
              password_hash = excluded.password_hash,
              password_salt = excluded.password_salt,
              credential_version = credential_version + 1,
              updated_at = CURRENT_TIMESTAMP
          `)
          .bind(
            pwdId,
            storeId,
            userId,
            pwdData.hash,
            pwdData.salt,
            pwdData.algorithm,
            pwdData.iterations
          )
      )
    }

    // 3. Update PIN if provided
    if (data.pin) {
      const pinData = await createPinHash(data.pin)
      const pinId = `pin_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
      statements.push(
        db
          .prepare(`
            INSERT INTO employee_pin_credentials (
              id, store_id, user_id, pin_hash, pin_salt, kdf_algorithm, kdf_iterations, status
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active')
            ON CONFLICT (store_id, user_id) DO UPDATE SET
              pin_hash = excluded.pin_hash,
              pin_salt = excluded.pin_salt,
              credential_version = credential_version + 1,
              updated_at = CURRENT_TIMESTAMP
          `)
          .bind(
            pinId,
            storeId,
            userId,
            pinData.hash,
            pinData.salt,
            pinData.algorithm,
            pinData.iterations
          )
      )
    }

    // 4. Update Role if provided
    if (data.roleCode) {
      const role = await db
        .prepare(`SELECT id FROM roles WHERE store_id = ?1 AND code = ?2 LIMIT 1`)
        .bind(storeId, data.roleCode)
        .first<{ id: string }>()

      if (role) {
        statements.push(
          db
            .prepare(`
              UPDATE store_memberships
              SET role_id = ?3, updated_at = CURRENT_TIMESTAMP
              WHERE store_id = ?1 AND user_id = ?2
            `)
            .bind(storeId, userId, role.id)
        )
      }
    }

    if (statements.length > 0) {
      await db.batch(statements)
    }

    // Fetch updated
    const updated = await db
      .prepare(`
        SELECT
          u.id, u.username, u.display_name, u.email, u.phone,
          r.code AS role_code, r.name AS role_name, u.status,
          CASE WHEN pin.id IS NOT NULL AND pin.status = 'active' THEN 1 ELSE 0 END AS has_pin,
          u.created_at, u.updated_at
        FROM users u
        INNER JOIN store_memberships m ON m.store_id = u.store_id AND m.user_id = u.id
        INNER JOIN roles r ON r.store_id = u.store_id AND r.id = m.role_id
        LEFT JOIN employee_pin_credentials pin ON pin.store_id = u.store_id AND pin.user_id = u.id
        WHERE u.store_id = ?1 AND u.id = ?2
        LIMIT 1
      `)
      .bind(storeId, userId)
      .first<StaffRow>()

    if (!updated) {
      return { ok: false, error: 'staff_not_found' }
    }

    return {
      ok: true,
      staff: {
        id: updated.id,
        username: updated.username,
        displayName: updated.display_name,
        email: updated.email,
        phone: updated.phone,
        roleCode: updated.role_code,
        roleName: updated.role_name,
        status: updated.status === 'active' ? 'active' : 'disabled',
        hasPin: updated.has_pin === 1,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      }
    }
  } catch (error) {
    console.error('Update staff failed:', error)
    return { ok: false, error: 'update_failed' }
  }
}

export async function deleteStaffMember(
  db: D1Database,
  storeId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: 'cannot_delete_owner' | 'delete_failed' }> {
  try {
    const role = await db
      .prepare(`
        SELECT r.code
        FROM store_memberships m
        INNER JOIN roles r ON r.store_id = m.store_id AND r.id = m.role_id
        WHERE m.store_id = ?1 AND m.user_id = ?2
        LIMIT 1
      `)
      .bind(storeId, userId)
      .first<{ code: string }>()

    if (role?.code === 'owner') {
      return { ok: false, error: 'cannot_delete_owner' }
    }

    await db.batch([
      db.prepare(`UPDATE users SET status = 'disabled' WHERE store_id = ?1 AND id = ?2`).bind(storeId, userId),
      db.prepare(`UPDATE store_memberships SET status = 'revoked' WHERE store_id = ?1 AND user_id = ?2`).bind(storeId, userId),
      db.prepare(`UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE store_id = ?1 AND user_id = ?2`).bind(storeId, userId)
    ])

    return { ok: true }
  } catch (error) {
    console.error('Delete staff failed:', error)
    return { ok: false, error: 'delete_failed' }
  }
}
