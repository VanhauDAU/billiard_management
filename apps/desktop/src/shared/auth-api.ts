import type {
  AuthSessionResponse,
  ChangePasswordRequest,
  ChangePinRequest,
  EmployeeListResponse,
  LoginResponse,
  PasswordLoginRequest,
  PermissionContextResponse,
  PinLoginRequest,
  StaffItem,
  StaffListResponse,
  VerifyPinRequest,
  VerifyPinResponse
} from '@billiards/contracts'

export type DesktopPinLoginInput = PinLoginRequest

export type DesktopLoginInput = PasswordLoginRequest

export type DesktopVerifyPinInput = VerifyPinRequest

export type DesktopChangePasswordInput = ChangePasswordRequest

export type DesktopChangePasswordResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; message?: string }

export type DesktopChangePinInput = ChangePinRequest

export type DesktopChangePinResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; message?: string }

export type DesktopAuthState =
  | {
      status: 'signed_out'
    }
  | {
      status: 'authenticated'
      session: AuthSessionResponse
      user?: LoginResponse['user']
      store?: LoginResponse['store']
    }
  | {
      status: 'device_not_ready'
    }
  | {
      status: 'unavailable'
      reason: 'backend_unavailable'
    }
  | {
      status: 'local_error'
      reason: 'secure_storage_unavailable' | 'invalid_local_session_credential'
    }

export type DesktopLoginResult =
  | {
      ok: true
      data: LoginResponse
    }
  | {
      ok: false
      error:
        | 'invalid_credentials'
        | 'user_disabled'
        | 'role_mismatch'
        | 'store_inactive'
        | 'backend_unavailable'
        | 'secure_storage_unavailable'
        | 'session_storage_failed'
      message?: string
    }

export type DesktopVerifyPinResult =
  | {
      ok: true
      data?: VerifyPinResponse
    }
  | {
      ok: false
      error: 'invalid_pin' | 'pin_not_set' | 'verification_unavailable' | 'backend_unavailable'
      message?: string
    }

export type DesktopEmployeeListResult =
  | {
      ok: true
      value: EmployeeListResponse
    }
  | {
      ok: false
      error: 'device_not_ready' | 'backend_unavailable'
    }

export type DesktopPinLoginResult =
  | {
      ok: true
      session: AuthSessionResponse
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
      retryAfterSeconds?: number
    }

export interface DesktopLogoutResult {
  ok: true
  remoteRevoked: boolean
}

export type DesktopPermissionResult =
  | {
      ok: true
      value: PermissionContextResponse
    }
  | {
      ok: false
      error: 'signed_out' | 'device_not_ready' | 'backend_unavailable' | 'secure_storage_unavailable'
    }

// Staff management results
export type DesktopStaffListResult =
  | {
      ok: true
      data: StaffListResponse
    }
  | {
      ok: false
      error: string
    }

export type DesktopCreateStaffResult =
  | {
      ok: true
      data: { ok: true; staff: StaffItem }
    }
  | {
      ok: false
      error: string
      message?: string
    }

export type DesktopUpdateStaffResult =
  | {
      ok: true
      data: { ok: true; staff: StaffItem }
    }
  | {
      ok: false
      error: string
    }

export type DesktopDeleteStaffResult =
  | {
      ok: true
    }
  | {
      ok: false
      error: string
      message?: string
    }