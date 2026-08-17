import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getBackendHealth } from '../api/backend-client'
import { isTrustedRendererUrl } from '../security/trusted-url'

export function registerBackendIpc(): void {
  ipcMain.handle(IPC_CHANNELS.backendHealth, async (event) => {
    const senderUrl = event.senderFrame?.url ?? event.sender.getURL()

    if (!isTrustedRendererUrl(senderUrl)) {
      throw new Error('Forbidden IPC sender')
    }

    return getBackendHealth()
  })
}
