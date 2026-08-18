const SECRET_BYTES = 32
const DEVICE_SCHEME = 'Device'

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

  const prefix = `${DEVICE_SCHEME} `

  if (!authorization.startsWith(prefix)) {
    return null
  }

  const value = authorization
    .slice(prefix.length)
    .trim()

  const separatorIndex =
    value.indexOf('.')

  if (
    separatorIndex <= 0 ||
    separatorIndex !==
      value.lastIndexOf('.')
  ) {
    return null
  }

  const deviceId =
    value.slice(0, separatorIndex)

  const secret =
    value.slice(separatorIndex + 1)

  if (!deviceId) {
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