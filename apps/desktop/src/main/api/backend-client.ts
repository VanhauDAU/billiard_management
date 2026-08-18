import { app } from 'electron'

import {
  ActivateDeviceResponseSchema,
  ApiHealthResponseSchema,
  AuthSessionResponseSchema,
  CreateStaffRequest,
  DeviceContextSchema,
  EmployeeListResponseSchema,
  LoginResponse,
  LoginResponseSchema,
  LogoutResponseSchema,
  PasswordLoginRequest,
  PermissionContextResponseSchema,
  PinLoginResponseSchema,
  StaffItem,
  StaffListResponse,
  StaffListResponseSchema,
  TableCommandApiResponseSchema,
  TableConfigurationResponseSchema,
  UpdateStaffRequest,
  VerifyPinRequest,
  VerifyPinResponse,
  VerifyPinResponseSchema
} from '@billiards/contracts'

import type {
  ActivateDeviceRequest,
  ActivateDeviceResponse,
  ApiHealthResponse,
  AuthSessionResponse,
  DeviceContext,
  EmployeeListResponse,
  LogoutResponse,
  PermissionContextResponse,
  PinLoginRequest,
  PinLoginResponse,
  TableCommandApiResponse,
  TableConfigurationResponse,
  TableManagementCommand
} from '@billiards/contracts'

const DEFAULT_TIMEOUT_MS = 5000
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export interface DeviceCredential {
  deviceId: string
  deviceSecret: string
}

export class BackendApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly retryAfterSeconds?: number
  ) {
    super(code)
    this.name = 'BackendApiError'
  }
}

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.MAIN_VITE_API_BASE_URL || 'http://localhost:8787'

  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error('MAIN_VITE_API_BASE_URL is invalid')
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error('MAIN_VITE_API_BASE_URL contains unsupported URL components')
  }

  if (app.isPackaged) {
    if (url.protocol !== 'https:') {
      throw new Error('MAIN_VITE_API_BASE_URL must use HTTPS in packaged builds')
    }
  } else {
    const isSecure = url.protocol === 'https:'
    const isLocalHttp = url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)

    if (!isSecure && !isLocalHttp) {
      throw new Error('Development HTTP backend must use a loopback host')
    }
  }

  return url.toString().replace(/\/$/, '')
}

async function requestJson(
  path: string,
  init?: RequestInit,
  acceptedErrorStatuses: readonly number[] = []
): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const url = `${getApiBaseUrl()}${path}`
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    })

    const isAcceptedError = acceptedErrorStatuses.includes(response.status)

    if (!response.ok && !isAcceptedError) {
      let code = 'backend_unavailable'
      let retryAfterSeconds: number | undefined

      try {
        const body = (await response.json()) as {
          error?: string
          retryAfterSeconds?: number
        }

        if (body.error) {
          code = body.error
        }
        if (typeof body.retryAfterSeconds === 'number') {
          retryAfterSeconds = body.retryAfterSeconds
        }
      } catch {}

      throw new BackendApiError(response.status, code, retryAfterSeconds)
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function getDeviceAuthorization(credential?: DeviceCredential): string | undefined {
  if (!credential) return undefined
  return ['Device ', credential.deviceId, '.', credential.deviceSecret].join('')
}

export async function getBackendHealth(): Promise<ApiHealthResponse> {
  const body = await requestJson('/api/health')
  const parsed = ApiHealthResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_backend_health_response')
  }
  return parsed.data
}

// =========================================================
// PASSWORD LOGIN HTTP
// =========================================================

export async function loginWithPasswordHttp(
  input: PasswordLoginRequest
): Promise<LoginResponse> {
  const body = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  const parsed = LoginResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_login_response')
  }

  return parsed.data
}

// =========================================================
// VERIFY PIN HTTP
// =========================================================

export async function verifyPinHttp(
  sessionToken: string,
  input: VerifyPinRequest
): Promise<VerifyPinResponse> {
  const body = await requestJson('/api/auth/verify-pin', {
    method: 'POST',
    headers: {
      'X-Auth-Session': sessionToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  const parsed = VerifyPinResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_verify_pin_response')
  }

  return parsed.data
}

// =========================================================
// STAFF MANAGEMENT HTTP
// =========================================================

export async function listStaffHttp(sessionToken: string): Promise<StaffListResponse> {
  const body = await requestJson('/api/staff', {
    method: 'GET',
    headers: {
      'X-Auth-Session': sessionToken
    }
  })

  const parsed = StaffListResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_staff_list_response')
  }

  return parsed.data
}

export async function createStaffHttp(
  sessionToken: string,
  data: CreateStaffRequest
): Promise<{ ok: true; staff: StaffItem }> {
  const body = await requestJson('/api/staff', {
    method: 'POST',
    headers: {
      'X-Auth-Session': sessionToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  return body as { ok: true; staff: StaffItem }
}

export async function updateStaffHttp(
  sessionToken: string,
  id: string,
  data: UpdateStaffRequest
): Promise<{ ok: true; staff: StaffItem }> {
  const body = await requestJson(`/api/staff/${id}`, {
    method: 'PUT',
    headers: {
      'X-Auth-Session': sessionToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  return body as { ok: true; staff: StaffItem }
}

export async function deleteStaffHttp(
  sessionToken: string,
  id: string
): Promise<{ ok: true }> {
  const body = await requestJson(`/api/staff/${id}`, {
    method: 'DELETE',
    headers: {
      'X-Auth-Session': sessionToken
    }
  })

  return body as { ok: true }
}

// =========================================================
// DEVICE & SESSION & POS CLIENT METHODS
// =========================================================

export async function activateDevice(
  input: ActivateDeviceRequest
): Promise<ActivateDeviceResponse> {
  const body = await requestJson('/api/devices/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  const parsed = ActivateDeviceResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_device_activation_response')
  }

  return parsed.data
}

export async function getDeviceContext(credential: DeviceCredential): Promise<DeviceContext> {
  const body = await requestJson('/api/pos/context', {
    method: 'GET',
    headers: {
      Authorization: getDeviceAuthorization(credential) || ''
    }
  })

  const parsed = DeviceContextSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_device_context_response')
  }

  return parsed.data
}

export async function getAuthEmployees(
  credential: DeviceCredential
): Promise<EmployeeListResponse> {
  const body = await requestJson('/api/auth/employees', {
    method: 'GET',
    headers: {
      Authorization: getDeviceAuthorization(credential) || ''
    }
  })

  const parsed = EmployeeListResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_employee_list_response')
  }

  return parsed.data
}

export async function loginEmployeeWithPin(
  credential: DeviceCredential,
  input: PinLoginRequest
): Promise<PinLoginResponse> {
  const body = await requestJson('/api/auth/pin', {
    method: 'POST',
    headers: {
      Authorization: getDeviceAuthorization(credential) || '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  const parsed = PinLoginResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_pin_login_response')
  }

  return parsed.data
}

export async function getTableConfiguration(
  credential: DeviceCredential | null,
  sessionToken: string
): Promise<TableConfigurationResponse> {
  const headers: Record<string, string> = {
    'X-Auth-Session': sessionToken
  }
  if (credential) {
    headers.Authorization = getDeviceAuthorization(credential) || ''
  }

  const body = await requestJson('/api/pos/tables/configuration', {
    method: 'GET',
    headers
  })

  const parsed = TableConfigurationResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_table_configuration_response')
  }

  return parsed.data
}

export async function executeTableCommand(
  credential: DeviceCredential | null,
  sessionToken: string,
  command: TableManagementCommand
): Promise<TableCommandApiResponse> {
  const headers: Record<string, string> = {
    'X-Auth-Session': sessionToken,
    'Content-Type': 'application/json'
  }
  if (credential) {
    headers.Authorization = getDeviceAuthorization(credential) || ''
  }

  const body = await requestJson(
    '/api/pos/tables/commands',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(command)
    },
    [404, 409]
  )

  const parsed = TableCommandApiResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_table_command_response')
  }

  return parsed.data
}

export async function getAuthSession(
  credential: DeviceCredential | null,
  sessionToken: string
): Promise<AuthSessionResponse> {
  const headers: Record<string, string> = {
    'X-Auth-Session': sessionToken
  }
  if (credential) {
    headers.Authorization = getDeviceAuthorization(credential) || ''
  }

  const body = await requestJson('/api/auth/session', {
    method: 'GET',
    headers
  })

  const parsed = AuthSessionResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_auth_session_response')
  }

  return parsed.data
}

export async function getAuthPermissions(
  credential: DeviceCredential | null,
  sessionToken: string
): Promise<PermissionContextResponse> {
  const headers: Record<string, string> = {
    'X-Auth-Session': sessionToken
  }
  if (credential) {
    headers.Authorization = getDeviceAuthorization(credential) || ''
  }

  const body = await requestJson('/api/auth/permissions', {
    method: 'GET',
    headers
  })

  const parsed = PermissionContextResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_permission_context_response')
  }

  return parsed.data
}

export async function logoutAuthSession(
  credential: DeviceCredential | null,
  sessionToken: string
): Promise<LogoutResponse> {
  const headers: Record<string, string> = {
    'X-Auth-Session': sessionToken
  }
  if (credential) {
    headers.Authorization = getDeviceAuthorization(credential) || ''
  }

  const body = await requestJson('/api/auth/logout', {
    method: 'POST',
    headers
  })

  const parsed = LogoutResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error('invalid_logout_response')
  }

  return parsed.data
}
