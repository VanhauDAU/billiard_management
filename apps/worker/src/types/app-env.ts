import type {
  DeviceContext
} from '@billiards/contracts'

export type AppBindings =
  CloudflareBindings & {
    SYSTEM_DIAGNOSTICS_TOKEN?: string
  }

export type AppEnv = {
  Bindings: AppBindings

  Variables: {
    deviceContext: DeviceContext
  }
}
