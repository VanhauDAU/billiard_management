import {
  safeHashEqual,
  sha256Hex
} from './device-credential'

const SESSION_SECRET_BYTES = 32

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const SESSION_SECRET_PATTERN =
  /^[a-f0-9]{64}$/i

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

export type ParsedSessionToken = {
  sessionId: string
  secret: string
}

export type CreatedSessionCredential = {
  sessionId: string
  secret: string
  token: string
  secretHash: string
}

export function generateSessionSecret():
string {
  const bytes =
    new Uint8Array(
      SESSION_SECRET_BYTES
    )

  crypto.getRandomValues(bytes)

  return bytesToHex(bytes)
}

export function parseSessionToken(
  token: string | undefined
): ParsedSessionToken | null {
  if (!token) {
    return null
  }

  const value =
    token.trim()

  const separatorIndex =
    value.indexOf('.')

  if (
    separatorIndex <= 0 ||
    separatorIndex !==
      value.lastIndexOf('.')
  ) {
    return null
  }

  const sessionId =
    value.slice(
      0,
      separatorIndex
    )

  const secret =
    value.slice(
      separatorIndex + 1
    )

  if (
    !UUID_PATTERN.test(sessionId)
  ) {
    return null
  }

  if (
    !SESSION_SECRET_PATTERN.test(secret)
  ) {
    return null
  }

  return {
    sessionId,
    secret
  }
}

export async function hashSessionSecret(
  secret: string
): Promise<string> {
  if (
    !SESSION_SECRET_PATTERN.test(secret)
  ) {
    throw new Error(
      'Invalid session secret'
    )
  }

  return sha256Hex(secret)
}

export async function verifySessionSecret(
  secret: string,
  expectedHash: string
): Promise<boolean> {
  if (
    !SESSION_SECRET_PATTERN.test(secret)
  ) {
    return false
  }

  if (
    !/^[a-f0-9]{64}$/i.test(
      expectedHash
    )
  ) {
    return false
  }

  const actualHash =
    await hashSessionSecret(
      secret
    )

  return safeHashEqual(
    actualHash,
    expectedHash
  )
}

export async function createSessionCredential():
Promise<CreatedSessionCredential> {
  const sessionId =
    crypto.randomUUID()

  const secret =
    generateSessionSecret()

  const secretHash =
    await hashSessionSecret(
      secret
    )

  return {
    sessionId,
    secret,

    token:
      `${sessionId}.${secret}`,

    secretHash
  }
}