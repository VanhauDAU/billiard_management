import { app } from 'electron'

import {
  ActivateDeviceResponseSchema,
  ApiHealthResponseSchema,
  AuthSessionResponseSchema,
  DeviceContextSchema,
  EmployeeListResponseSchema,
  LogoutResponseSchema,
  PinLoginResponseSchema
} from '@billiards/contracts'

import type {
  ActivateDeviceRequest,
  ActivateDeviceResponse,
  ApiHealthResponse,
  AuthSessionResponse,
  DeviceContext,
  EmployeeListResponse,
  LogoutResponse,
  PinLoginRequest,
  PinLoginResponse
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
  const baseUrl = import.meta.env.MAIN_VITE_API_BASE_URL

  if (!baseUrl) {
    throw new Error('MAIN_VITE_API_BASE_URL is not configured')
  }

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

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,

      signal: controller.signal,

      headers: {
        Accept: 'application/json',

        ...init?.headers
      }
    })

    let body: unknown = null

    try {
      body = await response.json()
    } catch {
      body = null
    }

    if (!response.ok) {
      const code =
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof body.error === 'string'
          ? body.error
          : `http_${response.status}`
      const retryAfterSeconds =
        typeof body === 'object' &&
        body !== null &&
        'retryAfterSeconds' in body &&
        typeof body.retryAfterSeconds === 'number' &&
        Number.isFinite(body.retryAfterSeconds) &&
        body.retryAfterSeconds > 0
          ? body.retryAfterSeconds
          : undefined
      throw new BackendApiError(response.status, code, retryAfterSeconds)
    }

    return body
  } finally {
    clearTimeout(timeout)
  }
}
function getDeviceAuthorization(credential: DeviceCredential): string {
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
      Authorization: getDeviceAuthorization(credential)
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
      Authorization: getDeviceAuthorization(credential)
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
      Authorization: getDeviceAuthorization(credential),

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

export async function getAuthSession(
  credential: DeviceCredential,
  sessionToken: string
): Promise<AuthSessionResponse> {
  const body = await requestJson('/api/auth/session', {
    method: 'GET',

    headers: {
      Authorization: getDeviceAuthorization(credential),

      'X-Auth-Session': sessionToken
    }
  })

  const parsed = AuthSessionResponseSchema.safeParse(body)

  if (!parsed.success) {
    throw new Error('invalid_auth_session_response')
  }

  return parsed.data
}

export async function logoutAuthSession(
  credential: DeviceCredential,
  sessionToken: string
): Promise<LogoutResponse> {
  const body = await requestJson('/api/auth/logout', {
    method: 'POST',

    headers: {
      Authorization: getDeviceAuthorization(credential),

      'X-Auth-Session': sessionToken
    }
  })

  const parsed = LogoutResponseSchema.safeParse(body)

  if (!parsed.success) {
    throw new Error('invalid_logout_response')
  }

  return parsed.data
}
