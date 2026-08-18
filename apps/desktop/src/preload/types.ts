import type { ActivateDesktopDeviceInput, DesktopDeviceState } from '../shared/device-api'
import type {
  DesktopAuthState,
  DesktopCreateStaffResult,
  DesktopDeleteStaffResult,
  DesktopEmployeeListResult,
  DesktopLoginInput,
  DesktopLoginResult,
  DesktopLogoutResult,
  DesktopPermissionResult,
  DesktopPinLoginInput,
  DesktopPinLoginResult,
  DesktopStaffListResult,
  DesktopUpdateStaffResult,
  DesktopVerifyPinInput,
  DesktopVerifyPinResult
} from '../shared/auth-api'
import type {
  CreateStaffRequest,
  UpdateStaffRequest
} from '@billiards/contracts'
import type {
  DesktopTableCommandInput,
  DesktopTableCommandResult,
  DesktopTableConfigurationResult
} from '../shared/table-api'

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
    getState(): Promise<DesktopAuthState>
    getEmployees(): Promise<DesktopEmployeeListResult>
    getPermissions(): Promise<DesktopPermissionResult>
    login(input: DesktopPinLoginInput): Promise<DesktopPinLoginResult>
    loginWithPassword(input: DesktopLoginInput): Promise<DesktopLoginResult>
    verifyPin(input: DesktopVerifyPinInput): Promise<DesktopVerifyPinResult>
    logout(): Promise<DesktopLogoutResult>
  }

  staff: {
    list(): Promise<DesktopStaffListResult>
    create(data: CreateStaffRequest): Promise<DesktopCreateStaffResult>
    update(id: string, data: UpdateStaffRequest): Promise<DesktopUpdateStaffResult>
    delete(id: string): Promise<DesktopDeleteStaffResult>
  }

  tables: {
    getConfiguration(): Promise<DesktopTableConfigurationResult>
    executeCommand(input: DesktopTableCommandInput): Promise<DesktopTableCommandResult>
  }
}
