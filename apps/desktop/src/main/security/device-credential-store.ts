import {
  app,
  safeStorage
} from 'electron'

import {
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile
} from 'node:fs/promises'

import {
  join
} from 'node:path'

export interface StoredDeviceCredential {
  version: 1

  deviceId: string

  deviceSecret: string
}

const CREDENTIAL_VERSION = 1

function getDeviceDirectory(): string {
  return join(
    app.getPath('userData'),
    'device'
  )
}

function getCredentialPath(): string {
  return join(
    getDeviceDirectory(),
    'credential.bin'
  )
}

function isValidCredential(
  value: unknown
): value is StoredDeviceCredential {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false
  }

  const candidate =
    value as Partial<StoredDeviceCredential>

  return (
    candidate.version ===
      CREDENTIAL_VERSION &&

    typeof candidate.deviceId ===
      'string' &&

    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      candidate.deviceId
    ) &&

    typeof candidate.deviceSecret ===
      'string' &&

    /^[0-9a-f]{64}$/i.test(
      candidate.deviceSecret
    )
  )
}

async function requireEncryption(): Promise<void> {
  const available =
    await safeStorage
      .isAsyncEncryptionAvailable()

  if (!available) {
    throw new Error(
      'secure_storage_unavailable'
    )
  }
}

export async function assertDeviceCredentialStorageAvailable(): Promise<void> {
  await requireEncryption()
}

export async function saveDeviceCredential(
  credential: Omit<
    StoredDeviceCredential,
    'version'
  >
): Promise<void> {
  await requireEncryption()

  const directory =
    getDeviceDirectory()

  await mkdir(
    directory,
    {
      recursive: true
    }
  )

  const value: StoredDeviceCredential = {
    version:
      CREDENTIAL_VERSION,

    deviceId:
      credential.deviceId,

    deviceSecret:
      credential.deviceSecret
  }

  const plaintext =
    JSON.stringify(value)

  const encrypted =
    await safeStorage
      .encryptStringAsync(
        plaintext
      )

  const destination =
    getCredentialPath()

  const temporary =
    `${destination}.${crypto.randomUUID()}.tmp`

  await writeFile(
    temporary,
    encrypted,
    {
      mode: 0o600
    }
  )

  await rename(
    temporary,
    destination
  )
}

export async function loadDeviceCredential(): Promise<
  StoredDeviceCredential | null
> {
  const path =
    getCredentialPath()

  let encrypted: Buffer

  try {
    encrypted =
      await readFile(path)
  } catch (error) {
    const code =
      (
        error as NodeJS.ErrnoException
      ).code

    if (code === 'ENOENT') {
      return null
    }

    throw error
  }

  await requireEncryption()

  const initialDecryption =
    await safeStorage
      .decryptStringAsync(
        encrypted
      )

  const decrypted =
    initialDecryption.shouldReEncrypt
      ? await safeStorage
          .decryptStringAsync(
            encrypted
          )
      : initialDecryption

  let parsed: unknown

  try {
    parsed =
      JSON.parse(
        decrypted.result
      )
  } catch {
    throw new Error(
      'invalid_device_credential_file'
    )
  }

  if (
    !isValidCredential(parsed)
  ) {
    throw new Error(
      'invalid_device_credential_file'
    )
  }

  if (
    initialDecryption.shouldReEncrypt
  ) {
    await saveDeviceCredential({
      deviceId:
        parsed.deviceId,

      deviceSecret:
        parsed.deviceSecret
    })
  }

  return parsed
}

export async function deleteDeviceCredential(): Promise<void> {
  try {
    await unlink(
      getCredentialPath()
    )
  } catch (error) {
    const code =
      (
        error as NodeJS.ErrnoException
      ).code

    if (code !== 'ENOENT') {
      throw error
    }
  }
}
