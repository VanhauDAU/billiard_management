import type {
  AuthContext,
  PermissionKey
} from '@billiards/contracts'


export type PermissionContext = {
  authContext:
    AuthContext

  permissions:
    ReadonlySet<
      PermissionKey
    >
}