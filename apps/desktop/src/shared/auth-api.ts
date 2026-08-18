import type {
  AuthSessionResponse,
  EmployeeListResponse,
  PermissionContextResponse,
  PinLoginRequest
} from '@billiards/contracts'


export type DesktopPinLoginInput =
  PinLoginRequest


export type DesktopAuthState =
  | {
      status:
        'signed_out'
    }
  | {
      status:
        'authenticated'

      session:
        AuthSessionResponse
    }
  | {
      status:
        'device_not_ready'
    }
  | {
      status:
        'unavailable'

      reason:
        'backend_unavailable'
    }
  | {
      status:
        'local_error'

      reason:
        | 'secure_storage_unavailable'
        | 'invalid_local_session_credential'
    }


export type DesktopEmployeeListResult =
  | {
      ok: true

      value:
        EmployeeListResponse
    }
  | {
      ok: false

      error:
        | 'device_not_ready'
        | 'backend_unavailable'
    }


export type DesktopPinLoginResult =
  | {
      ok: true

      session:
        AuthSessionResponse
    }
  | {
      ok: false

      error:
        | 'invalid_employee_or_pin'
        | 'pin_not_configured'
        | 'pin_locked'
        | 'authentication_unavailable'
        | 'device_not_ready'
        | 'backend_unavailable'
        | 'secure_storage_unavailable'
        | 'session_storage_failed'

      retryAfterSeconds?:
        number
    }


export interface DesktopLogoutResult {
  ok: true

  remoteRevoked: boolean
}
export type DesktopPermissionResult =
  | {
      ok: true

      value:
        PermissionContextResponse
    }
  | {
      ok: false

      error:
        | 'signed_out'
        | 'device_not_ready'
        | 'backend_unavailable'
        | 'secure_storage_unavailable'
    }