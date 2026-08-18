import { app } from 'electron'

import type {
  ActivateDeviceRequest
} from '@billiards/contracts'

import type {
  ActivateDesktopDeviceInput,
  DesktopDeviceState
} from '../../shared/device-api'

import {
  activateDevice,
  BackendApiError,
  getDeviceContext
} from '../api/backend-client'

import {
  getOrCreateInstallationId
} from './installation-id'

import {
  assertDeviceCredentialStorageAvailable,
  loadDeviceCredential,
  saveDeviceCredential
} from '../security/device-credential-store'

function getDesktopPlatform():
  | 'windows'
  | 'macos' {
  switch (process.platform) {
    case 'win32':
      return 'windows'

    case 'darwin':
      return 'macos'

    default:
      throw new Error(
        `unsupported_desktop_platform:${process.platform}`
      )
  }
}

function isBlockedError(
  error: BackendApiError
): error is BackendApiError & {
  code:
    | 'device_revoked'
    | 'device_inactive'
    | 'store_inactive'
} {
  return (
    error.code ===
      'device_revoked' ||

    error.code ===
      'device_inactive' ||

    error.code ===
      'store_inactive'
  )
}

async function resolveCredentialState(
  installationId: string,
  credential: {
    deviceId: string
    deviceSecret: string
  }
): Promise<DesktopDeviceState> {
  try {
    const context =
      await getDeviceContext(
        credential
      )

    return {
      status: 'ready',
      installationId,
      context
    }
  } catch (error) {
    if (
      error instanceof
        BackendApiError
    ) {
      if (
        error.status === 401 &&
        error.code ===
          'invalid_device_credential'
      ) {
        return {
          status:
            'needs_reactivation',

          installationId,

          reason:
            'invalid_device_credential'
        }
      }

      if (
        error.status === 403 &&
        isBlockedError(error)
      ) {
        return {
          status: 'blocked',

          installationId,

          reason: error.code
        }
      }
    }

    return {
      status: 'unavailable',
      installationId,
      reason:
        'backend_unavailable'
    }
  }
}

export async function getDesktopDeviceState(): Promise<DesktopDeviceState> {
  const installationId =
    await getOrCreateInstallationId()

  const credential =
    await loadDeviceCredential()

  if (!credential) {
    return {
      status: 'not_activated',
      installationId
    }
  }

  return resolveCredentialState(
    installationId,
    credential
  )
}

export async function activateDesktopDevice(
  input: ActivateDesktopDeviceInput
): Promise<DesktopDeviceState> {
  const activationToken =
    input.activationToken.trim()

  const name =
    input.name.trim()

  if (
    activationToken.length < 32 ||
    activationToken.length > 128
  ) {
    throw new Error(
      'invalid_activation_token_format'
    )
  }

  if (
    name.length < 1 ||
    name.length > 100
  ) {
    throw new Error(
      'invalid_device_name'
    )
  }

  const installationId =
    await getOrCreateInstallationId()

  const request:
    ActivateDeviceRequest = {
      activationToken,

      installationId,

      name,

      deviceType:
        'desktop_pos',

      platform:
        getDesktopPlatform(),

      appVersion:
        app.getVersion()
    }
  await assertDeviceCredentialStorageAvailable()
  const activation =
    await activateDevice(
      request
    )

  const credential = {
    deviceId:
      activation.deviceId,

    deviceSecret:
      activation.deviceSecret
  }

  /*
   * Activation token đã bị consume ở server.
   *
   * Vì vậy phải lưu credential ngay sau
   * response 201 để không làm mất secret.
   */
  await saveDeviceCredential(
    credential
  )

  return resolveCredentialState(
    installationId,
    credential
  )
}