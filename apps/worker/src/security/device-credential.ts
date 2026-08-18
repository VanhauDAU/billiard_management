const SECRET_BYTES = 32
const DEVICE_SCHEME = 'device'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte
      .toString(16)
      .padStart(2, '0'))
    .join('')
}

export function generateDeviceSecret(): string {
  const bytes = new Uint8Array(SECRET_BYTES)

  crypto.getRandomValues(bytes)

  return bytesToHex(bytes)
}

export async function sha256Hex(
  value: string
): Promise<string> {
  const encoded = new TextEncoder()
    .encode(value)

  const digest = await crypto.subtle.digest(
    'SHA-256',
    encoded
  )

  return bytesToHex(
    new Uint8Array(digest)
  )
}

export function safeHashEqual(
  first: string,
  second: string
): boolean {
  if (first.length !== second.length) {
    return false
  }

  const encoder = new TextEncoder()

  return crypto.subtle.timingSafeEqual(
    encoder.encode(first),
    encoder.encode(second)
  )
}

export type ParsedDeviceCredential = {
  deviceId: string
  secret: string
}

export function parseDeviceAuthorization(
  authorization: string | undefined
): ParsedDeviceCredential | null {
  if (!authorization) {
    return null
  }

  const separatorIndex =
    authorization.indexOf(' ')

  if (separatorIndex <= 0) {
    return null
  }

  const scheme = authorization
    .slice(0, separatorIndex)
    .toLowerCase()

  if (scheme !== DEVICE_SCHEME) {
    return null
  }

  const value = authorization
    .slice(separatorIndex + 1)
    .trim()

  const credentialSeparator =
    value.indexOf('.')

  if (
    credentialSeparator <= 0 ||
    credentialSeparator !==
      value.lastIndexOf('.')
  ) {
    return null
  }

  const deviceId =
    value.slice(
      0,
      credentialSeparator
    )

  const secret =
    value.slice(
      credentialSeparator + 1
    )

  if (!UUID_PATTERN.test(deviceId)) {
    return null
  }

  if (!/^[a-f0-9]{64}$/i.test(secret)) {
    return null
  }

  return {
    deviceId,
    secret
  }
}
