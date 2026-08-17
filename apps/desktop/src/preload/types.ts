export interface BackendHealth {
  ok: boolean
  service: string
}

export interface DesktopApi {
  app: {
    getVersion(): Promise<string>
  }

  backend: {
    health(): Promise<BackendHealth>
  }
}