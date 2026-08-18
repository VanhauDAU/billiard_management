import type {
  TableCommandApiResponse,
  TableConfigurationResponse,
  TableManagementCommand
} from '@billiards/contracts'


export type DesktopTableCommandInput =
  TableManagementCommand


export type DesktopTableConfigurationResult =
  | {
      ok: true

      value:
        TableConfigurationResponse
    }
  | {
      ok: false

      error:
        | 'signed_out'
        | 'device_not_ready'
        | 'permission_denied'
        | 'backend_unavailable'
        | 'secure_storage_unavailable'
    }


export type DesktopTableCommandResult =
  | {
      /*
       * Transport/auth/permission succeeded.
       *
       * value itself can still represent a
       * normal business rejection such as
       * table_name_conflict.
       */
      ok: true

      value:
        TableCommandApiResponse
    }
  | {
      ok: false

      error:
        | 'signed_out'
        | 'device_not_ready'
        | 'permission_denied'
        | 'backend_unavailable'
        | 'secure_storage_unavailable'
    }