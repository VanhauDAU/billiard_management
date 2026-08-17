import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { DesktopApi } from './types'

const desktopApi = Object.freeze({
  app: Object.freeze({
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.appGetVersion)
  }),

  backend: Object.freeze({
    health: () =>
      ipcRenderer.invoke(IPC_CHANNELS.backendHealth)
  })
}) satisfies DesktopApi

contextBridge.exposeInMainWorld('desktopApi', desktopApi)
