import {
  ipcMain
} from 'electron'

import {
  TableManagementCommandSchema
} from '@billiards/contracts'

import {
  IPC_CHANNELS
} from '../../shared/ipc-channels'

import {
  executeDesktopTableCommand,
  getDesktopTableConfiguration
} from '../table/table-service'

import {
  assertTrustedIpcSender
} from '../security/ipc-sender'


export function registerTableIpc():
void {
  ipcMain.handle(
    IPC_CHANNELS
      .tablesGetConfiguration,

    async (
      event
    ) => {
      assertTrustedIpcSender(
        event
      )


      return (
        getDesktopTableConfiguration()
      )
    }
  )


  ipcMain.handle(
    IPC_CHANNELS
      .tablesExecuteCommand,

    async (
      event,
      rawInput:
        unknown
    ) => {
      assertTrustedIpcSender(
        event
      )


      const parsed =
        TableManagementCommandSchema
          .safeParse(
            rawInput
          )


      if (
        !parsed.success
      ) {
        throw new Error(
          'invalid_table_command_input'
        )
      }


      return (
        executeDesktopTableCommand(
          parsed.data
        )
      )
    }
  )
}