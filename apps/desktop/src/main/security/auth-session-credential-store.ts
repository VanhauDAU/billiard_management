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

import {
  SessionTokenSchema
} from '@billiards/contracts'


export interface StoredAuthSessionCredential {
  version: 1

  deviceId: string

  sessionToken: string
}


const CREDENTIAL_VERSION = 1

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i


function getAuthDirectory():
string {
  return join(
    app.getPath(
      'userData'
    ),
    'auth'
  )
}


function getCredentialPath():
string {
  return join(
    getAuthDirectory(),
    'session.bin'
  )
}


function isValidCredential(
  value: unknown
): value is StoredAuthSessionCredential {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false
  }

  const candidate =
    value as Partial<
      StoredAuthSessionCredential
    >

  if (
    candidate.version !==
      CREDENTIAL_VERSION
  ) {
    return false
  }

  if (
    typeof candidate.deviceId !==
      'string' ||
    !UUID_PATTERN.test(
      candidate.deviceId
    )
  ) {
    return false
  }

  if (
    typeof candidate.sessionToken !==
      'string'
  ) {
    return false
  }

  return (
    SessionTokenSchema
      .safeParse(
        candidate.sessionToken
      )
      .success
  )
}


async function requireEncryption():
Promise<void> {
  const available =
    await safeStorage
      .isAsyncEncryptionAvailable()

  if (!available) {
    throw new Error(
      'secure_storage_unavailable'
    )
  }
}


async function decryptCredential(
  encrypted: Buffer
): Promise<{
  result: string
  shouldReEncrypt: boolean
}> {
  try {
    const initial =
      await safeStorage
        .decryptStringAsync(
          encrypted
        )

    if (
      !initial.shouldReEncrypt
    ) {
      return initial
    }

    const refreshed =
      await safeStorage
        .decryptStringAsync(
          encrypted
        )

    return {
      result:
        refreshed.result,

      shouldReEncrypt:
        true
    }
  } catch {
    throw new Error(
      'invalid_auth_session_credential_file'
    )
  }
}


export async function assertAuthSessionCredentialStorageAvailable():
Promise<void> {
  await requireEncryption()
}


export async function saveAuthSessionCredential(
  credential: Omit<
    StoredAuthSessionCredential,
    'version'
  >
): Promise<void> {
  await requireEncryption()

  const directory =
    getAuthDirectory()

  await mkdir(
    directory,
    {
      recursive: true
    }
  )

  const value:
    StoredAuthSessionCredential = {
      version:
        CREDENTIAL_VERSION,

      deviceId:
        credential.deviceId,

      sessionToken:
        credential.sessionToken
    }

  if (
    !isValidCredential(value)
  ) {
    throw new Error(
      'invalid_auth_session_credential'
    )
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


export async function loadAuthSessionCredential():
Promise<
  StoredAuthSessionCredential | null
> {
  const path =
    getCredentialPath()

  let encrypted: Buffer

  try {
    encrypted =
      await readFile(
        path
      )
  } catch (error) {
    const code =
      (
        error as
          NodeJS.ErrnoException
      ).code

    if (
      code === 'ENOENT'
    ) {
      return null
    }

    throw error
  }

  await requireEncryption()

  const decrypted =
    await decryptCredential(
      encrypted
    )

  let parsed: unknown

  try {
    parsed =
      JSON.parse(
        decrypted.result
      )
  } catch {
    throw new Error(
      'invalid_auth_session_credential_file'
    )
  }

  if (
    !isValidCredential(
      parsed
    )
  ) {
    throw new Error(
      'invalid_auth_session_credential_file'
    )
  }

  if (
    decrypted.shouldReEncrypt
  ) {
    await saveAuthSessionCredential({
      deviceId:
        parsed.deviceId,

      sessionToken:
        parsed.sessionToken
    })
  }

  return parsed
}


export async function deleteAuthSessionCredential():
Promise<void> {
  try {
    await unlink(
      getCredentialPath()
    )
  } catch (error) {
    const code =
      (
        error as
          NodeJS.ErrnoException
      ).code

    if (
      code !== 'ENOENT'
    ) {
      throw error
    }
  }
}