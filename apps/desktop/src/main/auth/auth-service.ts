import type { AuthSessionResponse, PinLoginRequest } from '@billiards/contracts'

import type {
  DesktopAuthState,
  DesktopEmployeeListResult,
  DesktopLogoutResult,
  DesktopPinLoginResult,
  DesktopPermissionResult
} from '../../shared/auth-api'

import {
  BackendApiError,
  getAuthEmployees,
  getAuthPermissions,
  getAuthSession,
  loginEmployeeWithPin,
  logoutAuthSession
} from '../api/backend-client'

import { loadDeviceCredential } from '../security/device-credential-store'

import {
  assertAuthSessionCredentialStorageAvailable,
  deleteAuthSessionCredential,
  loadAuthSessionCredential,
  saveAuthSessionCredential
} from '../security/auth-session-credential-store'

function hasErrorMessage(error: unknown, message: string): boolean {
  return error instanceof Error && error.message === message
}

function isDeviceNotReadyError(error: BackendApiError): boolean {
  return (
    error.code === 'device_auth_required' ||
    error.code === 'invalid_device_credential' ||
    error.code === 'device_revoked' ||
    error.code === 'device_inactive' ||
    error.code === 'store_inactive'
  )
}

function toSafeSession(login: {
  sessionId: string

  expiresAt: string

  actor: AuthSessionResponse['actor']
}): AuthSessionResponse {
  return {
    sessionId: login.sessionId,

    expiresAt: login.expiresAt,

    actor: login.actor
  }
}

// =========================================================
// AUTH STATE
// =========================================================

export async function getDesktopAuthState(): Promise<DesktopAuthState> {
  let deviceCredential

  try {
    deviceCredential = await loadDeviceCredential()
  } catch (error) {
    if (hasErrorMessage(error, 'secure_storage_unavailable')) {
      return {
        status: 'local_error',

        reason: 'secure_storage_unavailable'
      }
    }

    return {
      status: 'device_not_ready'
    }
  }

  if (!deviceCredential) {
    return {
      status: 'device_not_ready'
    }
  }

  let sessionCredential

  try {
    sessionCredential = await loadAuthSessionCredential()
  } catch (error) {
    if (hasErrorMessage(error, 'secure_storage_unavailable')) {
      return {
        status: 'local_error',

        reason: 'secure_storage_unavailable'
      }
    }

    if (hasErrorMessage(error, 'invalid_auth_session_credential_file')) {
      /*
       * A corrupted local session credential
       * cannot be trusted or recovered.
       *
       * Delete it and require employee PIN
       * authentication again.
       */
      await deleteAuthSessionCredential()

      return {
        status: 'signed_out'
      }
    }

    throw error
  }

  if (!sessionCredential) {
    return {
      status: 'signed_out'
    }
  }

  if (sessionCredential.deviceId !== deviceCredential.deviceId) {
    await deleteAuthSessionCredential()

    return {
      status: 'signed_out'
    }
  }

  try {
    const session = await getAuthSession(deviceCredential, sessionCredential.sessionToken)

    return {
      status: 'authenticated',

      session
    }
  } catch (error) {
    if (error instanceof BackendApiError) {
      if (error.status === 401 && error.code === 'invalid_auth_session') {
        await deleteAuthSessionCredential()

        return {
          status: 'signed_out'
        }
      }

      if (isDeviceNotReadyError(error)) {
        return {
          status: 'device_not_ready'
        }
      }
    }

    return {
      status: 'unavailable',

      reason: 'backend_unavailable'
    }
  }
}

// =========================================================
// PERMISSION CONTEXT
// =========================================================

export async function getDesktopAuthPermissions():
Promise<DesktopPermissionResult> {
  let deviceCredential

  /*
   * Step 1:
   * Load the trusted Device credential.
   */
  try {
    deviceCredential =
      await loadDeviceCredential()
  } catch (error) {
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


  /*
   * A permission request can exist only
   * after Device activation.
   */
  if (!deviceCredential) {
    return {
      ok: false,

      error:
        'device_not_ready'
    }
  }


  let sessionCredential

  /*
   * Step 2:
   * Load AuthSession credential from
   * Electron secure storage.
   */
  try {
    sessionCredential =
      await loadAuthSessionCredential()
  } catch (error) {
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


    /*
     * Corrupted AuthSession local state
     * must not be trusted.
     */
    if (
      hasErrorMessage(
        error,
        'invalid_auth_session_credential_file'
      )
    ) {
      await deleteAuthSessionCredential()

      return {
        ok: false,

        error:
          'signed_out'
      }
    }


    return {
      ok: false,

      error:
        'backend_unavailable'
    }
  }


  /*
   * No local AuthSession means employee
   * authentication is not active.
   */
  if (!sessionCredential) {
    return {
      ok: false,

      error:
        'signed_out'
    }
  }


  /*
   * An AuthSession credential belongs to
   * exactly the Device that created it.
   *
   * If Device credential was rotated or
   * changed, discard the old local session.
   */
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


  /*
   * Step 3:
   * Main Process calls Worker with both:
   *
   * Authorization: Device ...
   * X-Auth-Session: ...
   *
   * Renderer never sees either raw secret.
   */
  try {
    const value =
      await getAuthPermissions(
        deviceCredential,

        sessionCredential
          .sessionToken
      )

    return {
      ok: true,

      value
    }
  } catch (error) {
    /*
     * Worker rejected the AuthSession.
     *
     * Local session must be deleted so the
     * next UI state goes back to PIN login.
     */
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

        return {
          ok: false,

          error:
            'signed_out'
        }
      }


      /*
       * Device itself is no longer trusted.
       */
      if (
        isDeviceNotReadyError(
          error
        )
      ) {
        return {
          ok: false,

          error:
            'device_not_ready'
        }
      }
    }


    /*
     * Includes:
     *
     * - network timeout
     * - authorization_unavailable
     * - HTTP 5xx
     * - malformed response
     * - unknown backend failure
     */
    return {
      ok: false,

      error:
        'backend_unavailable'
    }
  }
}

// =========================================================
// EMPLOYEE LIST
// =========================================================

export async function getDesktopAuthEmployees(): Promise<DesktopEmployeeListResult> {
  let deviceCredential

  try {
    deviceCredential = await loadDeviceCredential()
  } catch {
    return {
      ok: false,
      error: 'device_not_ready'
    }
  }

  if (!deviceCredential) {
    return {
      ok: false,
      error: 'device_not_ready'
    }
  }

  try {
    const value = await getAuthEmployees(deviceCredential)

    return {
      ok: true,
      value
    }
  } catch (error) {
    if (error instanceof BackendApiError && isDeviceNotReadyError(error)) {
      return {
        ok: false,
        error: 'device_not_ready'
      }
    }

    return {
      ok: false,
      error: 'backend_unavailable'
    }
  }
}

// =========================================================
// PIN LOGIN
// =========================================================

export async function loginDesktopEmployee(input: PinLoginRequest): Promise<DesktopPinLoginResult> {
  let deviceCredential

  try {
    deviceCredential = await loadDeviceCredential()
  } catch {
    return {
      ok: false,
      error: 'device_not_ready'
    }
  }

  if (!deviceCredential) {
    return {
      ok: false,
      error: 'device_not_ready'
    }
  }

  /*
   * Check secure storage BEFORE creating the
   * server AuthSession. Otherwise we could
   * receive a one-time secret that cannot
   * be persisted safely.
   */
  try {
    await assertAuthSessionCredentialStorageAvailable()
  } catch {
    return {
      ok: false,
      error: 'secure_storage_unavailable'
    }
  }

  try {
    const login = await loginEmployeeWithPin(deviceCredential, input)

    try {
      await saveAuthSessionCredential({
        deviceId: deviceCredential.deviceId,

        sessionToken: login.sessionToken
      })
    } catch (error) {
      /*
       * The server session has already been
       * created. Best-effort revoke it if
       * local persistence unexpectedly fails.
       */
      try {
        await logoutAuthSession(deviceCredential, login.sessionToken)
      } catch {
        // Best effort only.
      }

      console.error('Failed to persist AuthSession credential:', error)

      return {
        ok: false,
        error: 'session_storage_failed'
      }
    }

    return {
      ok: true,

      session: toSafeSession(login)
    }
  } catch (error) {
    if (error instanceof BackendApiError) {
      if (isDeviceNotReadyError(error)) {
        return {
          ok: false,
          error: 'device_not_ready'
        }
      }

      switch (error.code) {
        case 'invalid_employee_or_pin':
          return {
            ok: false,
            error: 'invalid_employee_or_pin'
          }

        case 'pin_not_configured':
          return {
            ok: false,
            error: 'pin_not_configured'
          }

        case 'pin_locked':
          return {
            ok: false,
            error: 'pin_locked',

            retryAfterSeconds: error.retryAfterSeconds
          }

        case 'authentication_unavailable':
          return {
            ok: false,
            error: 'authentication_unavailable'
          }
      }
    }

    return {
      ok: false,
      error: 'backend_unavailable'
    }
  }
}

// =========================================================
// LOGOUT
// =========================================================

export async function logoutDesktopEmployee(): Promise<DesktopLogoutResult> {
  let remoteRevoked = false

  const sessionCredential = await loadAuthSessionCredential()

  if (!sessionCredential) {
    return {
      ok: true,
      remoteRevoked: false
    }
  }

  const deviceCredential = await loadDeviceCredential()

  if (deviceCredential && deviceCredential.deviceId === sessionCredential.deviceId) {
    try {
      await logoutAuthSession(deviceCredential, sessionCredential.sessionToken)

      remoteRevoked = true
    } catch {
      /*
       * Local logout must still succeed.
       * The server session will expire by
       * its absolute TTL if remote revoke
       * was impossible.
       */
      remoteRevoked = false
    }
  }

  await deleteAuthSessionCredential()

  return {
    ok: true,
    remoteRevoked
  }
}
