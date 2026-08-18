import {
  ActivateDeviceResponseSchema,
  ApiHealthResponseSchema,
  DeviceContextSchema
} from '@billiards/contracts'

import type {
  ActivateDeviceRequest,
  ActivateDeviceResponse,
  ApiHealthResponse,
  DeviceContext
} from '@billiards/contracts'

const DEFAULT_TIMEOUT_MS = 5000

export interface DeviceCredential {
  deviceId: string
  deviceSecret: string
}

export class BackendApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string
  ) {
    super(code)

    this.name = 'BackendApiError'
  }
}

function getApiBaseUrl(): string {
  const baseUrl =
    import.meta.env.MAIN_VITE_API_BASE_URL

  if (!baseUrl) {
    throw new Error(
      'MAIN_VITE_API_BASE_URL is not configured'
    )
  }

  return baseUrl.replace(/\/$/, '')
}

async function requestJson(
  path: string,
  init?: RequestInit
): Promise<unknown> {
  const controller =
    new AbortController()

  const timeout =
    setTimeout(() => {
      controller.abort()
    }, DEFAULT_TIMEOUT_MS)

  try {
    const response =
      await fetch(
        `${getApiBaseUrl()}${path}`,
        {
          ...init,

          signal:
            controller.signal,

          headers: {
            Accept:
              'application/json',

            ...init?.headers
          }
        }
      )

    let body: unknown = null

    try {
      body =
        await response.json()
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

      throw new BackendApiError(
        response.status,
        code
      )
    }

    return body
  } finally {
    clearTimeout(timeout)
  }
}

export async function getBackendHealth(): Promise<ApiHealthResponse> {
  const body =
    await requestJson(
      '/api/health'
    )

  const parsed =
    ApiHealthResponseSchema
      .safeParse(body)

  if (!parsed.success) {
    throw new Error(
      'invalid_backend_health_response'
    )
  }

  return parsed.data
}

export async function activateDevice(
  input: ActivateDeviceRequest
): Promise<ActivateDeviceResponse> {
  const body =
    await requestJson(
      '/api/devices/activate',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body:
          JSON.stringify(input)
      }
    )

  const parsed =
    ActivateDeviceResponseSchema
      .safeParse(body)

  if (!parsed.success) {
    throw new Error(
      'invalid_device_activation_response'
    )
  }

  return parsed.data
}

export async function getDeviceContext(
  credential: DeviceCredential
): Promise<DeviceContext> {
  const body =
    await requestJson(
      '/api/pos/context',
      {
        method: 'GET',

        headers: {
          Authorization:
            `Device ${credential.deviceId}.${credential.deviceSecret}`
        }
      }
    )

  const parsed =
    DeviceContextSchema
      .safeParse(body)

  if (!parsed.success) {
    throw new Error(
      'invalid_device_context_response'
    )
  }

  return parsed.data
}