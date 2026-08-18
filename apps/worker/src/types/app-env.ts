import type {
  AuthContext,
  AuthSessionResponse,
  DeviceContext
} from '@billiards/contracts'

import type {
  PermissionContext
} from './permission-context'


export type AppBindings =
  CloudflareBindings & {
    SYSTEM_DIAGNOSTICS_TOKEN?: string
  }


export type AppEnv = {
  Bindings:
    AppBindings

  Variables: {
    deviceContext:
      DeviceContext

    authContext:
      AuthContext

    authSession:
      AuthSessionResponse

    permissionContext:
      PermissionContext
  }
}