import {
  safeHashEqual
} from './device-credential'

const PIN_PATTERN =
  /^\d{4,6}$/

const PIN_SALT_BYTES = 16

const PIN_HASH_LENGTH_BITS = 256

export const PIN_KDF_ALGORITHM =
  'pbkdf2-sha256'

export const PIN_KDF_ITERATIONS =
  600_000

function bytesToHex(
  bytes: Uint8Array
): string {
  return Array.from(bytes)
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
}

function hexToBytes(
  value: string
): Uint8Array {
  if (
    value.length % 2 !== 0 ||
    !/^[a-f0-9]+$/i.test(value)
  ) {
    throw new Error(
      'Invalid hexadecimal value'
    )
  }

  const bytes =
    new Uint8Array(
      value.length / 2
    )

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    bytes[index] =
      Number.parseInt(
        value.slice(
          index * 2,
          index * 2 + 2
        ),
        16
      )
  }

  return bytes
}

export function isValidEmployeePin(
  pin: string
): boolean {
  return PIN_PATTERN.test(pin)
}

export function generatePinSalt():
string {
  const salt =
    new Uint8Array(
      PIN_SALT_BYTES
    )

  crypto.getRandomValues(salt)

  return bytesToHex(salt)
}

export async function derivePinHash(
  pin: string,
  saltHex: string,
  iterations: number
): Promise<string> {
  if (!isValidEmployeePin(pin)) {
    throw new Error(
      'Invalid employee PIN'
    )
  }

  if (iterations < 1) {
    throw new Error(
      'Invalid PBKDF2 iteration count'
    )
  }

  const keyMaterial =
    await crypto.subtle.importKey(
      'raw',
      new TextEncoder()
        .encode(pin),
      {
        name: 'PBKDF2'
      },
      false,
      [
        'deriveBits'
      ]
    )

  const derivedBits =
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt:
          hexToBytes(saltHex),
        iterations
      },
      keyMaterial,
      PIN_HASH_LENGTH_BITS
    )

  return bytesToHex(
    new Uint8Array(
      derivedBits
    )
  )
}

export async function createPinHash(
  pin: string
): Promise<{
  hash: string
  salt: string
  algorithm:
    typeof PIN_KDF_ALGORITHM
  iterations: number
}> {
  const salt =
    generatePinSalt()

  const hash =
    await derivePinHash(
      pin,
      salt,
      PIN_KDF_ITERATIONS
    )

  return {
    hash,
    salt,
    algorithm:
      PIN_KDF_ALGORITHM,
    iterations:
      PIN_KDF_ITERATIONS
  }
}

export async function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string,
  iterations: number
): Promise<boolean> {
  if (!isValidEmployeePin(pin)) {
    return false
  }

  const actualHash =
    await derivePinHash(
      pin,
      salt,
      iterations
    )

  return safeHashEqual(
    actualHash,
    expectedHash
  )
}