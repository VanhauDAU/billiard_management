import type {
  DeviceContext
} from '@billiards/contracts'

export interface ActivateDesktopDeviceInput {
  activationToken: string
  name: string
}

export type DesktopDeviceState =
  | {
      status: 'not_activated'
      installationId: string
    }
  | {
      status: 'ready'
      installationId: string
      context: DeviceContext
    }
  | {
      status: 'needs_reactivation'
      installationId: string
      reason:
        | 'invalid_device_credential'
        | 'invalid_local_credential'
    }
  | {
      status: 'blocked'
      installationId: string
      reason:
        | 'device_revoked'
        | 'device_inactive'
        | 'store_inactive'
    }
  | {
      status: 'unavailable'
      installationId: string
      reason: 'backend_unavailable'
    }
  | {
      status: 'local_error'
      reason:
        | 'invalid_installation_identity'
        | 'secure_storage_unavailable'
    }
