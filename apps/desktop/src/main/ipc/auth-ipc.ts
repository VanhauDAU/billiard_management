import { ipcMain } from 'electron'

import { PinLoginRequestSchema } from '@billiards/contracts'

import { IPC_CHANNELS } from '../../shared/ipc-channels'

import {
  getDesktopAuthEmployees,
  getDesktopAuthPermissions,
  getDesktopAuthState,
  loginDesktopEmployee,
  logoutDesktopEmployee
} from '../auth/auth-service'

import { assertTrustedIpcSender } from '../security/ipc-sender'

export function registerAuthIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.authGetState,

    async (event) => {
      assertTrustedIpcSender(event)

      return getDesktopAuthState()
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.authGetEmployees,

    async (event) => {
      assertTrustedIpcSender(event)

      return getDesktopAuthEmployees()
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.authGetPermissions,

    async (event) => {
      assertTrustedIpcSender(event)

      return getDesktopAuthPermissions()
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.authLogin,

    async (event, rawInput: unknown) => {
      assertTrustedIpcSender(event)

      const parsed = PinLoginRequestSchema.safeParse(rawInput)

      if (!parsed.success) {
        throw new Error('invalid_pin_login_input')
      }

      return loginDesktopEmployee(parsed.data)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.authLogout,

    async (event) => {
      assertTrustedIpcSender(event)

      return logoutDesktopEmployee()
    }
  )
}
