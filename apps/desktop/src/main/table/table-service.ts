import type {
  TableManagementCommand
} from '@billiards/contracts'

import type {
  DesktopTableCommandResult,
  DesktopTableConfigurationResult
} from '../../shared/table-api'

import {
  BackendApiError,
  executeTableCommand,
  getTableConfiguration
} from '../api/backend-client'

import {
  loadDeviceCredential
} from '../security/device-credential-store'

import {
  deleteAuthSessionCredential,
  loadAuthSessionCredential
} from '../security/auth-session-credential-store'


function hasErrorMessage(
  error:
    unknown,

  message:
    string
): boolean {
  return (
    error instanceof Error &&
    error.message === message
  )
}


function isDeviceNotReadyError(
  error:
    BackendApiError
): boolean {
  return (
    error.code ===
      'device_auth_required' ||

    error.code ===
      'invalid_device_credential' ||

    error.code ===
      'device_revoked' ||

    error.code ===
      'device_inactive' ||

    error.code ===
      'store_inactive'
  )
}


async function loadCredentials():
Promise<
  | {
      ok: true

      deviceCredential:
        NonNullable<
          Awaited<
            ReturnType<
              typeof loadDeviceCredential
            >
          >
        >

      sessionToken:
        string
    }
  | {
      ok: false

      error:
        | 'signed_out'
        | 'device_not_ready'
        | 'secure_storage_unavailable'
    }
> {
  let deviceCredential


  try {
    deviceCredential =
      await loadDeviceCredential()
  } catch (
    error
  ) {
    if (
      hasErrorMessage(
        error,
        'secure_storage_unavailable'
      )
    ) {
      return {
        ok: false,
        error:
          'secure_storage_unavailable'
      }
    }


    return {
      ok: false,
      error:
        'device_not_ready'
    }
  }


  if (
    !deviceCredential
  ) {
    return {
      ok: false,
      error:
        'device_not_ready'
    }
  }


  let sessionCredential


  try {
    sessionCredential =
      await loadAuthSessionCredential()
  } catch (
    error
  ) {
    if (
      hasErrorMessage(
        error,
        'secure_storage_unavailable'
      )
    ) {
      return {
        ok: false,
        error:
          'secure_storage_unavailable'
      }
    }


    return {
      ok: false,
      error:
        'signed_out'
    }
  }


  if (
    !sessionCredential
  ) {
    return {
      ok: false,
      error:
        'signed_out'
    }
  }


  if (
    sessionCredential.deviceId !==
      deviceCredential.deviceId
  ) {
    await deleteAuthSessionCredential()

    return {
      ok: false,
      error:
        'signed_out'
    }
  }


  return {
    ok: true,

    deviceCredential,

    sessionToken:
      sessionCredential
        .sessionToken
  }
}


async function mapBackendFailure(
  error:
    unknown
): Promise<
  | 'signed_out'
  | 'device_not_ready'
  | 'permission_denied'
  | 'backend_unavailable'
> {
  if (
    error instanceof
      BackendApiError
  ) {
    if (
      error.status === 401 &&
      (
        error.code ===
          'invalid_auth_session' ||

        error.code ===
          'auth_session_required'
      )
    ) {
      await deleteAuthSessionCredential()

      return 'signed_out'
    }


    if (
      error.status === 403 &&
      error.code ===
        'permission_denied'
    ) {
      return 'permission_denied'
    }


    if (
      isDeviceNotReadyError(
        error
      )
    ) {
      return 'device_not_ready'
    }
  }


  return 'backend_unavailable'
}


export async function
getDesktopTableConfiguration():
Promise<
  DesktopTableConfigurationResult
> {
  const credentials =
    await loadCredentials()


  if (
    !credentials.ok
  ) {
    return credentials
  }


  try {
    const value =
      await getTableConfiguration(
        credentials.deviceCredential,
        credentials.sessionToken
      )


    return {
      ok: true,
      value
    }
  } catch (
    error
    ) {
    console.error(
        '[TABLE CONFIGURATION ERROR]',
        error
    )


    if (
        error instanceof
        BackendApiError
    ) {
        console.error(
        '[TABLE BACKEND ERROR]',
        {
            status:
            error.status,

            code:
            error.code,

            retryAfterSeconds:
            error.retryAfterSeconds
        }
        )
    }


    return {
        ok: false,

        error:
        await mapBackendFailure(
            error
        )
    }
    }
}
export async function
executeDesktopTableCommand(
  command:
    TableManagementCommand
): Promise<
  DesktopTableCommandResult
> {
  const credentials =
    await loadCredentials()


  if (
    !credentials.ok
  ) {
    return credentials
  }


  try {
    const value =
      await executeTableCommand(
        credentials
          .deviceCredential,

        credentials
          .sessionToken,

        command
      )


    return {
      ok: true,
      value
    }
  } catch (
    error
  ) {
    return {
      ok: false,

      error:
        await mapBackendFailure(
          error
        )
    }
  }
}