import { describe, expect, it } from 'vitest'
import { env } from 'cloudflare:test'
import { loginWithPassword, verifyUserPin } from '../src/services/auth-service'
import { createStaffMember, listStaffMembers } from '../src/services/staff-service'
import { createPasswordHash } from '../src/security/password-credential'
import { createPinHash } from '../src/security/pin-credential'

describe('Password Authentication & Staff Management', () => {
  it('allows owner to login with username and password, and manage staff', async () => {
    const storeId = `store_${crypto.randomUUID().slice(0, 8)}`
    const ownerId = `usr_${crypto.randomUUID().slice(0, 8)}`
    const roleId = `role_owner_${crypto.randomUUID().slice(0, 8)}`
    const membershipId = `mem_${crypto.randomUUID().slice(0, 8)}`
    const pwdCredId = `pwd_${crypto.randomUUID().slice(0, 8)}`
    const pinCredId = `pin_${crypto.randomUUID().slice(0, 8)}`

    // 1. Setup store, role, user, credentials
    await env.DB.prepare(
      `INSERT INTO stores (id, name, slug, status) VALUES (?1, 'Billiard Club King 88', ?2, 'active')`
    ).bind(storeId, `king-88-${storeId}`).run()

    await env.DB.prepare(
      `INSERT INTO roles (id, store_id, code, name, is_system, status) VALUES (?1, ?2, 'owner', 'Chủ quán', 1, 'active')`
    ).bind(roleId, storeId).run()

    await env.DB.prepare(
      `INSERT INTO users (id, store_id, username, username_normalized, display_name, status)
       VALUES (?1, ?2, 'chubida88', 'chubida88', 'Anh Chủ Quán', 'active')`
    ).bind(ownerId, storeId).run()

    await env.DB.prepare(
      `INSERT INTO store_memberships (id, store_id, user_id, role_id, status) VALUES (?1, ?2, ?3, ?4, 'active')`
    ).bind(membershipId, storeId, ownerId, roleId).run()

    const pwdHash = await createPasswordHash('MatKhau123@')
    await env.DB.prepare(
      `INSERT INTO user_password_credentials (id, store_id, user_id, password_hash, password_salt, kdf_algorithm, kdf_iterations, status)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active')`
    ).bind(pwdCredId, storeId, ownerId, pwdHash.hash, pwdHash.salt, pwdHash.algorithm, pwdHash.iterations).run()

    const pinHash = await createPinHash('1234')
    await env.DB.prepare(
      `INSERT INTO employee_pin_credentials (id, store_id, user_id, pin_hash, pin_salt, kdf_algorithm, kdf_iterations, status)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active')`
    ).bind(pinCredId, storeId, ownerId, pinHash.hash, pinHash.salt, pinHash.algorithm, pinHash.iterations).run()

    // 2. Test Login
    const loginResult = await loginWithPassword(env.DB, {
      username: 'chubida88',
      password: 'MatKhau123@'
    })

    expect(loginResult.ok).toBe(true)
    if (!loginResult.ok) throw new Error('Login failed')
    expect(loginResult.value.user.username).toBe('chubida88')
    expect(loginResult.value.user.roleCode).toBe('owner')
    expect(loginResult.value.store.name).toBe('Billiard Club King 88')
    expect(loginResult.value.sessionToken).toBeTruthy()

    // 3. Test Verify PIN
    const pinCheckSuccess = await verifyUserPin(env.DB, storeId, ownerId, '1234')
    expect(pinCheckSuccess.ok).toBe(true)

    const pinCheckFail = await verifyUserPin(env.DB, storeId, ownerId, '9999')
    expect(pinCheckFail.ok).toBe(false)

    // 4. Test Create Staff
    const staffCreation = await createStaffMember(env.DB, storeId, {
      displayName: 'Nguyễn Văn Thu Ngân',
      username: 'thungan01',
      password: 'ThuNganPass123@',
      pin: '6789',
      roleCode: 'cashier',
      phone: '0912345678'
    })

    expect(staffCreation.ok).toBe(true)
    if (!staffCreation.ok) throw new Error('Staff creation failed')
    expect(staffCreation.staff.username).toBe('thungan01')

    // 5. Test List Staff
    const staffList = await listStaffMembers(env.DB, storeId)
    expect(staffList.ok).toBe(true)
    expect(staffList.staff.length).toBeGreaterThanOrEqual(2)

    // 6. Test Staff Login
    const staffLogin = await loginWithPassword(env.DB, {
      username: 'thungan01',
      password: 'ThuNganPass123@',
      roleType: 'staff'
    })
    expect(staffLogin.ok).toBe(true)
  })
})
