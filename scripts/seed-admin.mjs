import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PASSWORD_SALT_BYTES = 16
const PASSWORD_HASH_BITS = 256
const PASSWORD_ITERATIONS = 100_000

const PIN_SALT_BYTES = 16
const PIN_HASH_BITS = 256
const PIN_ITERATIONS = 600_000

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function hashPassword(password) {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES)
  crypto.getRandomValues(salt)
  const saltHex = bytesToHex(salt)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBytes(saltHex),
      iterations: PASSWORD_ITERATIONS
    },
    keyMaterial,
    PASSWORD_HASH_BITS
  )

  return {
    hash: bytesToHex(new Uint8Array(bits)),
    salt: saltHex,
    iterations: PASSWORD_ITERATIONS
  }
}

async function hashPin(pin) {
  const salt = new Uint8Array(PIN_SALT_BYTES)
  crypto.getRandomValues(salt)
  const saltHex = bytesToHex(salt)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBytes(saltHex),
      iterations: PIN_ITERATIONS
    },
    keyMaterial,
    PIN_HASH_BITS
  )

  return {
    hash: bytesToHex(new Uint8Array(bits)),
    salt: saltHex,
    iterations: PIN_ITERATIONS
  }
}

async function seed() {
  const storeId = 'store_main_001'
  const storeName = 'Billiard Club Sài Gòn'
  const storeSlug = 'billiard-club-sai-gon'

  const userId = 'usr_admin_001'
  const username = 'admin'
  const password = 'admin123'
  const pin = '1234'
  const fullName = 'Lê Văn Hậu'
  const email = 'admin@billiards.vn'
  const phone = '0901234567'

  const staffUserId = 'usr_staff_001'
  const staffUsername = 'nhanvien'
  const staffPassword = 'nhanvien123'
  const staffPin = '5678'
  const staffFullName = 'Nguyễn Văn Thu Ngân'

  const roleOwnerId = 'role_owner_main'
  const roleManagerId = 'role_manager_main'
  const roleCashierId = 'role_cashier_main'
  const roleStaffId = 'role_staff_main'

  const pwdAdmin = await hashPassword(password)
  const pinAdmin = await hashPin(pin)

  const pwdStaff = await hashPassword(staffPassword)
  const pinStaff = await hashPin(staffPin)

  const sql = `
-- 1. Create or Update Store
INSERT OR REPLACE INTO stores (id, name, slug, address_text, phone, currency, status)
VALUES ('${storeId}', '${storeName}', '${storeSlug}', '123 Nguyễn Văn Cừ, Quận 5, TP.HCM', '${phone}', 'VND', 'active');

-- 2. Create Roles
INSERT OR REPLACE INTO roles (id, store_id, code, name, is_system, is_protected, status) VALUES
('${roleOwnerId}', '${storeId}', 'owner', 'Chủ cửa hàng', 1, 1, 'active'),
('${roleManagerId}', '${storeId}', 'manager', 'Quản lý', 1, 0, 'active'),
('${roleCashierId}', '${storeId}', 'cashier', 'Thu ngân', 1, 0, 'active'),
('${roleStaffId}', '${storeId}', 'staff', 'Nhân viên', 1, 0, 'active');

-- 3. Grant Owner All Permissions
INSERT OR IGNORE INTO role_permissions (store_id, role_id, permission_key)
SELECT '${storeId}', '${roleOwnerId}', permission_key FROM permission_catalog;

-- 4. Grant Staff/Cashier Permissions
INSERT OR IGNORE INTO role_permissions (store_id, role_id, permission_key)
SELECT '${storeId}', '${roleCashierId}', permission_key FROM permission_catalog
WHERE permission_key IN ('table.view', 'table.open', 'table.transfer', 'table.order', 'invoices.view', 'invoices.print', 'products.view');

INSERT OR IGNORE INTO role_permissions (store_id, role_id, permission_key)
SELECT '${storeId}', '${roleStaffId}', permission_key FROM permission_catalog
WHERE permission_key IN ('table.view', 'table.open', 'table.transfer', 'table.order', 'invoices.view', 'invoices.print', 'products.view');

-- 5. Admin User (Owner)
INSERT OR REPLACE INTO users (id, store_id, username, username_normalized, display_name, email, phone, status)
VALUES ('${userId}', '${storeId}', '${username}', '${username}', '${fullName}', '${email}', '${phone}', 'active');

INSERT OR REPLACE INTO user_password_credentials (id, store_id, user_id, password_hash, password_salt, kdf_algorithm, kdf_iterations, status)
VALUES ('pwd_admin_001', '${storeId}', '${userId}', '${pwdAdmin.hash}', '${pwdAdmin.salt}', 'pbkdf2-sha256', ${pwdAdmin.iterations}, 'active');

INSERT OR REPLACE INTO employee_pin_credentials (id, store_id, user_id, pin_hash, pin_salt, kdf_algorithm, kdf_iterations, status)
VALUES ('pin_admin_001', '${storeId}', '${userId}', '${pinAdmin.hash}', '${pinAdmin.salt}', 'pbkdf2-sha256', ${pinAdmin.iterations}, 'active');

INSERT OR REPLACE INTO store_memberships (id, store_id, user_id, role_id, status)
VALUES ('mem_admin_001', '${storeId}', '${userId}', '${roleOwnerId}', 'active');

-- 6. Staff User (Cashier)
INSERT OR REPLACE INTO users (id, store_id, username, username_normalized, display_name, email, phone, status)
VALUES ('${staffUserId}', '${storeId}', '${staffUsername}', '${staffUsername}', '${staffFullName}', 'staff@billiards.vn', '0909999888', 'active');

INSERT OR REPLACE INTO user_password_credentials (id, store_id, user_id, password_hash, password_salt, kdf_algorithm, kdf_iterations, status)
VALUES ('pwd_staff_001', '${storeId}', '${staffUserId}', '${pwdStaff.hash}', '${pwdStaff.salt}', 'pbkdf2-sha256', ${pwdStaff.iterations}, 'active');

INSERT OR REPLACE INTO employee_pin_credentials (id, store_id, user_id, pin_hash, pin_salt, kdf_algorithm, kdf_iterations, status)
VALUES ('pin_staff_001', '${storeId}', '${staffUserId}', '${pinStaff.hash}', '${pinStaff.salt}', 'pbkdf2-sha256', ${pinStaff.iterations}, 'active');

INSERT OR REPLACE INTO store_memberships (id, store_id, user_id, role_id, status)
VALUES ('mem_staff_001', '${storeId}', '${staffUserId}', '${roleCashierId}', 'active');

-- 7. Register Device for Main POS
INSERT OR REPLACE INTO devices (id, store_id, name, installation_id, device_type, platform, status)
VALUES ('dev_main_001', '${storeId}', 'Main POS Desktop', 'inst_main_pos', 'desktop_pos', 'windows', 'active');
`

  const tempSql = join(tmpdir(), `seed_${Date.now()}.sql`)
  writeFileSync(tempSql, sql, 'utf-8')

  try {
    execSync(`pnpm --dir apps/worker exec wrangler d1 execute billiards-control-plane --local --file="${tempSql}"`, {
      stdio: 'inherit'
    })
    console.log('✅ Seed successful!')
  } finally {
    try { unlinkSync(tempSql) } catch {}
  }
}

seed().catch(console.error)
