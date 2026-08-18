#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Password / PIN crypto helpers
const PASSWORD_SALT_BYTES = 16
const PASSWORD_HASH_BITS = 256
const PASSWORD_ITERATIONS = 100_000

const PIN_SALT_BYTES = 16
const PIN_HASH_BITS = 256
const PIN_ITERATIONS = 600_000

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function hashPassword(password: string) {
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

async function hashPin(pin: string) {
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

function parseArgs() {
  const args = process.argv.slice(2)
  const params: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true'
      params[key] = value
      if (value !== 'true') i++
    }
  }
  return params
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

async function main() {
  console.log('\n======================================================')
  console.log('   🎱 BILLIARDS MANAGEMENT - ADMIN PROVISIONING CLI   ')
  console.log('======================================================\n')

  const cliParams = parseArgs()
  const rl = createInterface({ input, output })

  const storeName = cliParams['store-name'] || (await rl.question('👉 Nhập Tên cửa hàng (Bắt buộc): '))
  if (!storeName.trim()) {
    console.error('❌ Tên cửa hàng không được để trống!')
    rl.close()
    process.exit(1)
  }

  const fullName = cliParams['full-name'] || (await rl.question('👉 Nhập Họ và tên chủ quán (Bắt buộc): '))
  if (!fullName.trim()) {
    console.error('❌ Họ và tên không được để trống!')
    rl.close()
    process.exit(1)
  }

  const username = cliParams['username'] || (await rl.question('👉 Nhập Tên đăng nhập (Bắt buộc, vd: chubida88): '))
  if (!username.trim()) {
    console.error('❌ Tên đăng nhập không được để trống!')
    rl.close()
    process.exit(1)
  }

  const password = cliParams['password'] || (await rl.question('👉 Nhập Mật khẩu (Bắt buộc, tối thiểu 6 ký tự): '))
  if (!password || password.length < 6) {
    console.error('❌ Mật khẩu phải có ít nhất 6 ký tự!')
    rl.close()
    process.exit(1)
  }

  let pin = cliParams['pin'] || (await rl.question('👉 Nhập Mã PIN đăng nhập 4 số (Mặc định: 1234): '))
  if (!pin.trim()) pin = '1234'
  if (!/^\d{4}$/.test(pin)) {
    console.error('❌ Mã PIN phải gồm đúng 4 chữ số!')
    rl.close()
    process.exit(1)
  }

  const phone = cliParams['phone'] || (await rl.question('👉 Nhập Số điện thoại (Không bắt buộc): '))
  const email = cliParams['email'] || (await rl.question('👉 Nhập Email (Không bắt buộc): '))
  const isRemote = cliParams['remote'] === 'true'

  rl.close()

  console.log('\n⏳ Đang khởi tạo cơ sở dữ liệu và mã hóa thông tin...')

  const storeId = `store_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  const baseSlug = slugify(storeName)
  const storeSlug = `${baseSlug}-${storeId.slice(-4)}`
  const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  const normalizedUsername = username.trim().toLowerCase()
  const membershipId = `mem_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  const pwdCredId = `pwd_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  const pinCredId = `pin_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  const deviceId = `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

  const roleOwnerId = `role_owner_${storeId.slice(-6)}`
  const roleManagerId = `role_manager_${storeId.slice(-6)}`
  const roleCashierId = `role_cashier_${storeId.slice(-6)}`
  const roleStaffId = `role_staff_${storeId.slice(-6)}`

  const pwdHashData = await hashPassword(password)
  const pinHashData = await hashPin(pin)

  const sqlStatements = `
-- 1. Create Store
INSERT INTO stores (id, name, slug, address_text, phone, currency, status)
VALUES ('${storeId}', '${storeName.replace(/'/g, "''")}', '${storeSlug}', NULL, ${phone ? `'${phone}'` : 'NULL'}, 'VND', 'active');

-- 2. Create Roles
INSERT INTO roles (id, store_id, code, name, is_system, is_protected, status) VALUES
('${roleOwnerId}', '${storeId}', 'owner', 'Chủ cửa hàng', 1, 1, 'active'),
('${roleManagerId}', '${storeId}', 'manager', 'Quản lý', 1, 0, 'active'),
('${roleCashierId}', '${storeId}', 'cashier', 'Thu ngân', 1, 0, 'active'),
('${roleStaffId}', '${storeId}', 'staff', 'Nhân viên', 1, 0, 'active');

-- 3. Grant Owner All Permissions
INSERT OR IGNORE INTO role_permissions (store_id, role_id, permission_key)
SELECT '${storeId}', '${roleOwnerId}', permission_key FROM permission_catalog;

-- 4. Grant Manager Core Permissions
INSERT OR IGNORE INTO role_permissions (store_id, role_id, permission_key)
SELECT '${storeId}', '${roleManagerId}', permission_key FROM permission_catalog
WHERE permission_key NOT IN ('role.manage', 'store.settings.manage');

-- 5. Grant Cashier/Staff POS Permissions
INSERT OR IGNORE INTO role_permissions (store_id, role_id, permission_key)
SELECT '${storeId}', '${roleCashierId}', permission_key FROM permission_catalog
WHERE permission_key IN ('table.view', 'table.open', 'table.transfer', 'table.order', 'invoices.view', 'invoices.print', 'products.view', 'customers.view', 'customers.create');

INSERT OR IGNORE INTO role_permissions (store_id, role_id, permission_key)
SELECT '${storeId}', '${roleStaffId}', permission_key FROM permission_catalog
WHERE permission_key IN ('table.view', 'table.open', 'table.transfer', 'table.order', 'invoices.view', 'invoices.print', 'products.view');

-- 6. Create User
INSERT INTO users (id, store_id, username, username_normalized, display_name, email, phone, status)
VALUES ('${userId}', '${storeId}', '${username.trim()}', '${normalizedUsername}', '${fullName.trim().replace(/'/g, "''")}', ${email ? `'${email.trim()}'` : 'NULL'}, ${phone ? `'${phone.trim()}'` : 'NULL'}, 'active');

-- 7. Password Credential
INSERT INTO user_password_credentials (id, store_id, user_id, password_hash, password_salt, kdf_algorithm, kdf_iterations, status)
VALUES ('${pwdCredId}', '${storeId}', '${userId}', '${pwdHashData.hash}', '${pwdHashData.salt}', 'pbkdf2-sha256', ${pwdHashData.iterations}, 'active');

-- 8. PIN Credential
INSERT INTO employee_pin_credentials (id, store_id, user_id, pin_hash, pin_salt, kdf_algorithm, kdf_iterations, status)
VALUES ('${pinCredId}', '${storeId}', '${userId}', '${pinHashData.hash}', '${pinHashData.salt}', 'pbkdf2-sha256', ${pinHashData.iterations}, 'active');

-- 9. Membership
INSERT INTO store_memberships (id, store_id, user_id, role_id, status)
VALUES ('${membershipId}', '${storeId}', '${userId}', '${roleOwnerId}', 'active');

-- 10. Default POS Device
INSERT INTO devices (id, store_id, name, installation_id, device_type, platform, status)
VALUES ('${deviceId}', '${storeId}', 'Main POS Desktop', 'inst_${storeId}', 'desktop_pos', 'windows', 'active');
`

  const tempSqlFile = join(tmpdir(), `provision_${Date.now()}.sql`)
  writeFileSync(tempSqlFile, sqlStatements, 'utf-8')

  try {
    const targetFlag = isRemote ? '--remote' : '--local'
    const command = `npx wrangler d1 execute DB ${targetFlag} --file="${tempSqlFile}"`
    console.log(`🚀 Đang chạy lệnh D1: ${command}`)
    execSync(command, { cwd: join(process.cwd(), 'apps/worker'), stdio: 'inherit' })

    console.log('\n✅ CẤP PHÁT CỬA HÀNG THÀNH CÔNG!\n')
    console.log('------------------------------------------------------')
    console.log(`🏪 Tên cửa hàng  : ${storeName}`)
    console.log(`🔑 Mã Store ID    : ${storeId}`)
    console.log(`👤 Họ tên chủ     : ${fullName}`)
    console.log(`🌐 Tên đăng nhập  : ${username}`)
    console.log(`🔒 Mật khẩu       : ${password}`)
    console.log(`🔢 Mã PIN 4 số    : ${pin}`)
    if (phone) console.log(`📞 Số điện thoại  : ${phone}`)
    if (email) console.log(`✉️  Email          : ${email}`)
    console.log('------------------------------------------------------')
    console.log('💡 Hướng dẫn: Khách hàng chỉ cần mở App Desktop, nhập Tên đăng nhập và Mật khẩu trên để bắt đầu sử dụng!')
    console.log('------------------------------------------------------\n')
  } catch (error) {
    console.error('❌ Lỗi khi thực thi câu lệnh SQL vào D1:', error)
  } finally {
    try {
      unlinkSync(tempSqlFile)
    } catch {}
  }
}

main().catch(console.error)
