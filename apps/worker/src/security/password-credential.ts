import { safeHashEqual } from './device-credential'

const PASSWORD_SALT_BYTES = 16
const PASSWORD_HASH_LENGTH_BITS = 256

export const PASSWORD_KDF_ALGORITHM = 'pbkdf2-sha256'
export const PASSWORD_KDF_ITERATIONS = 100_000

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 !== 0 || !/^[a-f0-9]+$/i.test(value)) {
    throw new Error('Invalid hexadecimal value')
  }

  const bytes = new Uint8Array(value.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

export function generatePasswordSalt(): string {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES)
  crypto.getRandomValues(salt)
  return bytesToHex(salt)
}

export async function derivePasswordHash(
  password: string,
  saltHex: string,
  iterations: number
): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('Mật khẩu không hợp lệ')
  }

  if (iterations < 1) {
    throw new Error('Invalid PBKDF2 iteration count')
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBytes(saltHex),
      iterations
    },
    keyMaterial,
    PASSWORD_HASH_LENGTH_BITS
  )

  return bytesToHex(new Uint8Array(derivedBits))
}

export async function createPasswordHash(password: string): Promise<{
  hash: string
  salt: string
  algorithm: typeof PASSWORD_KDF_ALGORITHM
  iterations: number
}> {
  const salt = generatePasswordSalt()
  const hash = await derivePasswordHash(password, salt, PASSWORD_KDF_ITERATIONS)

  return {
    hash,
    salt,
    algorithm: PASSWORD_KDF_ALGORITHM,
    iterations: PASSWORD_KDF_ITERATIONS
  }
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
  iterations: number
): Promise<boolean> {
  if (!password || password.length < 6) {
    return false
  }

  try {
    const actualHash = await derivePasswordHash(password, salt, iterations)
    return safeHashEqual(actualHash, expectedHash)
  } catch {
    return false
  }
}
