import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getBackendHealth } from '../api/backend-client'
import { assertTrustedIpcSender } from '../security/ipc-sender'

export function registerBackendIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.backendHealth,
    async (event) => {
      assertTrustedIpcSender(event)

      return getBackendHealth()
    }
  )
}
