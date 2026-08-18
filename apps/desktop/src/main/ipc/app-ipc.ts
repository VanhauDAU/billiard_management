import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { assertTrustedIpcSender } from '../security/ipc-sender'

export function registerAppIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.appGetVersion,
    (event) => {
      assertTrustedIpcSender(event)

      return app.getVersion()
    }
  )
}
