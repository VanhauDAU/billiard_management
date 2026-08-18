import { app } from 'electron'
import {
  mkdir,
  readFile,
  rename,
  writeFile
} from 'node:fs/promises'
import { join } from 'node:path'

interface InstallationFile {
  version: 1
  installationId: string
}

const INSTALLATION_FILE_VERSION = 1

function getDeviceDirectory(): string {
  return join(
    app.getPath('userData'),
    'device'
  )
}

function getInstallationFilePath(): string {
  return join(
    getDeviceDirectory(),
    'installation.json'
  )
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function parseInstallationFile(
  content: string
): InstallationFile {
  let parsed: unknown

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(
      'invalid_installation_identity_file'
    )
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null
  ) {
    throw new Error(
      'invalid_installation_identity_file'
    )
  }

  const candidate =
    parsed as Partial<InstallationFile>

  if (
    candidate.version !==
      INSTALLATION_FILE_VERSION ||
    !isUuid(
      candidate.installationId
    )
  ) {
    throw new Error(
      'invalid_installation_identity_file'
    )
  }

  return {
    version:
      INSTALLATION_FILE_VERSION,
    installationId:
      candidate.installationId
  }
}

async function writeInstallationFile(
  value: InstallationFile
): Promise<void> {
  const directory =
    getDeviceDirectory()

  await mkdir(
    directory,
    {
      recursive: true
    }
  )

  const destination =
    getInstallationFilePath()

  const temporary =
    `${destination}.${crypto.randomUUID()}.tmp`

  await writeFile(
    temporary,
    JSON.stringify(
      value,
      null,
      2
    ),
    {
      encoding: 'utf8',
      mode: 0o600
    }
  )

  await rename(
    temporary,
    destination
  )
}

export async function getOrCreateInstallationId(): Promise<string> {
  const path =
    getInstallationFilePath()

  try {
    const content =
      await readFile(
        path,
        'utf8'
      )

    return parseInstallationFile(
      content
    ).installationId
  } catch (error) {
    const code =
      (
        error as NodeJS.ErrnoException
      ).code

    if (code !== 'ENOENT') {
      throw error
    }
  }

  const installationId =
    crypto.randomUUID()

  await writeInstallationFile({
    version:
      INSTALLATION_FILE_VERSION,

    installationId
  })

  return installationId
}
