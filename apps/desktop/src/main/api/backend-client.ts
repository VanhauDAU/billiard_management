export interface BackendHealth {
  ok: boolean
  service: string
}

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.MAIN_VITE_API_BASE_URL

  if (!baseUrl) {
    throw new Error('MAIN_VITE_API_BASE_URL is not configured')
  }

  return baseUrl.replace(/\/$/, '')
}

export async function getBackendHealth(): Promise<BackendHealth> {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, 5000)

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`)
    }

    const data = (await response.json()) as BackendHealth

    if (
      typeof data.ok !== 'boolean' ||
      typeof data.service !== 'string'
    ) {
      throw new Error('Invalid backend health response')
    }

    return data
  } finally {
    clearTimeout(timeout)
  }
}
