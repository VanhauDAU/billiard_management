import { ipcMain } from 'electron'
import {
  ChangePasswordRequestSchema,
  ChangePinRequestSchema,
  CreateCategoryRequestSchema,
  CreateStaffRequestSchema,
  PasswordLoginRequestSchema,
  PinLoginRequestSchema,
  UpdateCategoryRequestSchema,
  UpdateStaffRequestSchema,
  VerifyPinRequestSchema
} from '@billiards/contracts'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import {
  changeDesktopPassword,
  changeDesktopPin,
  createDesktopCategory,
  createDesktopStaff,
  deleteDesktopCategory,
  deleteDesktopStaff,
  getDesktopAuthEmployees,
  getDesktopPermissions,
  getDesktopAuthState,
  listDesktopCategories,
  listDesktopStaff,
  loginDesktopEmployeeWithPin,
  loginDesktopWithPassword,
  logoutDesktopAuthSession,
  updateDesktopCategory,
  updateDesktopStaff,
  verifyDesktopPin
} from '../auth/auth-service'
import { assertTrustedIpcSender } from '../security/ipc-sender'

export function registerAuthIpc(): void {
  ipcMain.handle(IPC_CHANNELS.authGetState, async (event) => {
    assertTrustedIpcSender(event)
    return getDesktopAuthState()
  })

  ipcMain.handle(IPC_CHANNELS.authGetEmployees, async (event) => {
    assertTrustedIpcSender(event)
    return getDesktopAuthEmployees()
  })

  ipcMain.handle(IPC_CHANNELS.authGetPermissions, async (event) => {
    assertTrustedIpcSender(event)
    return getDesktopPermissions()
  })

  ipcMain.handle(IPC_CHANNELS.authLogin, async (event, rawInput: unknown) => {
    assertTrustedIpcSender(event)
    const parsed = PinLoginRequestSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error('invalid_pin_login_input')
    }
    return loginDesktopEmployeeWithPin(parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.authLoginWithPassword, async (event, rawInput: unknown) => {
    assertTrustedIpcSender(event)
    const parsed = PasswordLoginRequestSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error('invalid_password_login_input')
    }
    return loginDesktopWithPassword(parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.authVerifyPin, async (event, rawInput: unknown) => {
    assertTrustedIpcSender(event)
    const parsed = VerifyPinRequestSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error('invalid_verify_pin_input')
    }
    return verifyDesktopPin(parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.authChangePassword, async (event, rawInput: unknown) => {
    assertTrustedIpcSender(event)
    const parsed = ChangePasswordRequestSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error('invalid_change_password_input')
    }
    return changeDesktopPassword(parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.authChangePin, async (event, rawInput: unknown) => {
    assertTrustedIpcSender(event)
    const parsed = ChangePinRequestSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error('invalid_change_pin_input')
    }
    return changeDesktopPin(parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.authLogout, async (event) => {
    assertTrustedIpcSender(event)
    return logoutDesktopAuthSession()
  })

  // Staff Management IPC handlers
  ipcMain.handle(IPC_CHANNELS.staffList, async (event) => {
    assertTrustedIpcSender(event)
    return listDesktopStaff()
  })

  ipcMain.handle(IPC_CHANNELS.staffCreate, async (event, rawInput: unknown) => {
    assertTrustedIpcSender(event)
    const parsed = CreateStaffRequestSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error('invalid_create_staff_input')
    }
    return createDesktopStaff(parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.staffUpdate, async (event, rawInput: { id: string; data: unknown }) => {
    assertTrustedIpcSender(event)
    const parsed = UpdateStaffRequestSchema.safeParse(rawInput.data)
    if (!parsed.success) {
      throw new Error('invalid_update_staff_input')
    }
    return updateDesktopStaff(rawInput.id, parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.staffDelete, async (event, rawInput: { id: string }) => {
    assertTrustedIpcSender(event)
    return deleteDesktopStaff(rawInput.id)
  })

  // Category Management IPC handlers
  ipcMain.handle(IPC_CHANNELS.categoriesList, async (event) => {
    assertTrustedIpcSender(event)
    return listDesktopCategories()
  })

  ipcMain.handle(IPC_CHANNELS.categoriesCreate, async (event, rawInput: unknown) => {
    assertTrustedIpcSender(event)
    const parsed = CreateCategoryRequestSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error('invalid_create_category_input')
    }
    return createDesktopCategory(parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.categoriesUpdate, async (event, rawInput: { id: string; data: unknown }) => {
    assertTrustedIpcSender(event)
    const parsed = UpdateCategoryRequestSchema.safeParse(rawInput.data)
    if (!parsed.success) {
      throw new Error('invalid_update_category_input')
    }
    return updateDesktopCategory(rawInput.id, parsed.data)
  })

  ipcMain.handle(IPC_CHANNELS.categoriesDelete, async (event, rawInput: { id: string }) => {
    assertTrustedIpcSender(event)
    return deleteDesktopCategory(rawInput.id)
  })
}

