import type { ActivateDesktopDeviceInput, DesktopDeviceState } from '../shared/device-api'
import type {
  DesktopAuthState,
  DesktopEmployeeListResult,
  DesktopLogoutResult,
  DesktopPermissionResult,
  DesktopPinLoginInput,
  DesktopPinLoginResult
} from '../shared/auth-api'
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

  device: {
    getState(): Promise<DesktopDeviceState>

    activate(input: ActivateDesktopDeviceInput): Promise<DesktopDeviceState>
  }
  auth: {
    getState():
      Promise<DesktopAuthState>

    getEmployees():
      Promise<DesktopEmployeeListResult>

    getPermissions():
      Promise<DesktopPermissionResult>

    login(
      input:
        DesktopPinLoginInput
    ):
      Promise<DesktopPinLoginResult>

    logout():
      Promise<DesktopLogoutResult>
  }
}
