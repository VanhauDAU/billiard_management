import type {
  DeviceContext
} from '@billiards/contracts'

export type AppEnv = {
  Bindings: CloudflareBindings

  Variables: {
    deviceContext: DeviceContext
  }
}