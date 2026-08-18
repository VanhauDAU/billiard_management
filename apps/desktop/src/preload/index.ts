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
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.authGetState),
    getEmployees: () => ipcRenderer.invoke(IPC_CHANNELS.authGetEmployees),
    getPermissions: () => ipcRenderer.invoke(IPC_CHANNELS.authGetPermissions),
    login: (input) => ipcRenderer.invoke(IPC_CHANNELS.authLogin, input),
    loginWithPassword: (input) => ipcRenderer.invoke(IPC_CHANNELS.authLoginWithPassword, input),
    verifyPin: (input) => ipcRenderer.invoke(IPC_CHANNELS.authVerifyPin, input),
    changePassword: (input) => ipcRenderer.invoke(IPC_CHANNELS.authChangePassword, input),
    changePin: (input) => ipcRenderer.invoke(IPC_CHANNELS.authChangePin, input),
    logout: () => ipcRenderer.invoke(IPC_CHANNELS.authLogout)
  }),

  staff: Object.freeze({
    list: () => ipcRenderer.invoke(IPC_CHANNELS.staffList),
    create: (data) => ipcRenderer.invoke(IPC_CHANNELS.staffCreate, data),
    update: (id, data) => ipcRenderer.invoke(IPC_CHANNELS.staffUpdate, { id, data }),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.staffDelete, { id })
  }),

  tables: Object.freeze({
    getConfiguration: () => ipcRenderer.invoke(IPC_CHANNELS.tablesGetConfiguration),
    executeCommand: (input) => ipcRenderer.invoke(IPC_CHANNELS.tablesExecuteCommand, input)
  })
}) satisfies DesktopApi

contextBridge.exposeInMainWorld('desktopApi', desktopApi)