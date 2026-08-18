import type {
  ActivateDesktopDeviceInput,
  DesktopDeviceState
} from '../shared/device-api'

export interface BackendHealth {
  ok: boolean
  service: string
}

export interface DesktopApi {
  app: {
    getVersion():
      Promise<string>
  }

  backend: {
    health():
      Promise<BackendHealth>
  }

  device: {
    getState():
      Promise<DesktopDeviceState>

    activate(
      input:
        ActivateDesktopDeviceInput
    ):
      Promise<DesktopDeviceState>
  }
}