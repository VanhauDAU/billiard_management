import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS } from '../shared/ipc-channels'

import type { DesktopApi } from './types'

const desktopApi = Object.freeze({
  app: Object.freeze({
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.appGetVersion)
  }),

  backend: Object.freeze({
    health: () => ipcRenderer.invoke(IPC_CHANNELS.backendHealth)
  }),

  device: Object.freeze({
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.deviceGetState),

    activate: (input) => ipcRenderer.invoke(IPC_CHANNELS.deviceActivate, input)
  }),
  auth: Object.freeze({
    getState: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS.authGetState
      ),

    getEmployees: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS.authGetEmployees
      ),

    getPermissions: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS.authGetPermissions
      ),

    login: (input) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.authLogin,
        input
      ),

    logout: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS.authLogout
      )
  })
}) satisfies DesktopApi

contextBridge.exposeInMainWorld('desktopApi', desktopApi)
