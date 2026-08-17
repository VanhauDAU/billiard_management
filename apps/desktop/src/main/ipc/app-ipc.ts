import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { isTrustedRendererUrl } from '../security/trusted-url'

export function registerAppIpc(): void {
  ipcMain.handle(IPC_CHANNELS.appGetVersion, (event) => {
    const senderUrl = event.senderFrame?.url ?? event.sender.getURL()

    if (!isTrustedRendererUrl(senderUrl)) {
      throw new Error('Forbidden IPC sender')
    }

    return app.getVersion()
  })
}
