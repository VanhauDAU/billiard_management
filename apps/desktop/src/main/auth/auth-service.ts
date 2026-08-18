import type {
  CreateCategoryRequest,
  CreateStaffRequest,
  LoginResponse,
  PinLoginRequest,
  UpdateCategoryRequest,
  UpdateStaffRequest
} from '@billiards/contracts'

import type {
  DesktopAuthState,
  DesktopCategoryListResult,
  DesktopChangePasswordInput,
  DesktopChangePasswordResult,
  DesktopChangePinInput,
  DesktopChangePinResult,
  DesktopCreateCategoryResult,
  DesktopCreateStaffResult,
  DesktopDeleteCategoryResult,
  DesktopDeleteStaffResult,
  DesktopEmployeeListResult,
  DesktopLoginInput,
  DesktopLoginResult,
  DesktopLogoutResult,
  DesktopPermissionResult,
  DesktopPinLoginResult,
  DesktopStaffListResult,
  DesktopUpdateCategoryResult,
  DesktopUpdateStaffResult,
  DesktopVerifyPinInput,
  DesktopVerifyPinResult
} from '../../shared/auth-api'

import {
  BackendApiError,
  changePasswordHttp,
  changePinHttp,
  createCategoryHttp,
  createStaffHttp,
  deleteCategoryHttp,
  deleteStaffHttp,
  getAuthEmployees,
  getAuthPermissions,
  getAuthSession,
  listCategoriesHttp,
  listStaffHttp,
  loginEmployeeWithPin,
  loginWithPasswordHttp,
  logoutAuthSession,
  updateCategoryHttp,
  updateStaffHttp,
  verifyPinHttp
} from '../api/backend-client'

import { loadDeviceCredential } from '../security/device-credential-store'
import {
  assertAuthSessionCredentialStorageAvailable,
  deleteAuthSessionCredential,
  loadAuthSessionCredential,
  saveAuthSessionCredential
} from '../security/auth-session-credential-store'

function hasErrorMessage(error: unknown, message: string): boolean {
  return error instanceof Error && error.message === message
}

// In-memory cache of current user / store profile
let currentLoginData: LoginResponse | null = null

export async function getDesktopAuthState(): Promise<DesktopAuthState> {
  let sessionCredential
  try {
    sessionCredential = await loadAuthSessionCredential()
  } catch (error) {
    if (hasErrorMessage(error, 'secure_storage_unavailable')) {
      return {
        status: 'local_error',
        reason: 'secure_storage_unavailable'
      }
    }
    await deleteAuthSessionCredential()
    return { status: 'signed_out' }
  }

  if (!sessionCredential) {
    return { status: 'signed_out' }
  }

  const deviceCredential = await loadDeviceCredential().catch(() => null)

  try {
    const session = await getAuthSession(deviceCredential, sessionCredential.sessionToken)
    return {
      status: 'authenticated',
      session,
      user: currentLoginData?.user,
      store: currentLoginData?.store
    }
  } catch (error) {
    if (error instanceof BackendApiError && (error.code === 'invalid_auth_session' || error.status === 401)) {
      await deleteAuthSessionCredential()
      return { status: 'signed_out' }
    }
    return {
      status: 'unavailable',
      reason: 'backend_unavailable'
    }
  }
}

// =========================================================
// PASSWORD LOGIN (Owner, Manager, Staff)
// =========================================================

export async function loginDesktopWithPassword(
  input: DesktopLoginInput
): Promise<DesktopLoginResult> {
  try {
    await assertAuthSessionCredentialStorageAvailable()
  } catch {
    return {
      ok: false,
      error: 'secure_storage_unavailable',
      message: 'Không thể truy cập bộ nhớ bảo mật của hệ điều hành'
    }
  }

  try {
    const loginResponse = await loginWithPasswordHttp(input)

    try {
      await saveAuthSessionCredential({
        sessionToken: loginResponse.sessionToken
      })
    } catch {
      return {
        ok: false,
        error: 'session_storage_failed',
        message: 'Lưu phiên làm việc thất bại'
      }
    }

    currentLoginData = loginResponse

    return {
      ok: true,
      data: loginResponse
    }
  } catch (error) {
    if (error instanceof BackendApiError) {
      if (error.code === 'invalid_credentials') {
        return {
          ok: false,
          error: 'invalid_credentials',
          message: 'Tên đăng nhập hoặc mật khẩu không chính xác'
        }
      }
      if (error.code === 'user_disabled') {
        return {
          ok: false,
          error: 'user_disabled',
          message: 'Tài khoản này đã bị khóa'
        }
      }
      if (error.code === 'role_mismatch') {
        return {
          ok: false,
          error: 'role_mismatch',
          message: 'Tài khoản không thuộc quyền quản lý cửa hàng'
        }
      }
    }

    return {
      ok: false,
      error: 'backend_unavailable',
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.'
    }
  }
}

// =========================================================
// VERIFY 4-DIGIT PIN
// =========================================================

export async function verifyDesktopPin(
  input: DesktopVerifyPinInput
): Promise<DesktopVerifyPinResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'verification_unavailable', message: 'Chưa đăng nhập' }
  }

  try {
    const res = await verifyPinHttp(sessionCredential.sessionToken, input)
    return { ok: true, data: res }
  } catch (error) {
    if (error instanceof BackendApiError && error.code === 'invalid_pin') {
      return { ok: false, error: 'invalid_pin', message: 'Mã PIN 4 số không chính xác' }
    }
    return { ok: false, error: 'verification_unavailable', message: 'Xác thực mã PIN thất bại' }
  }
}

// =========================================================
// STAFF MANAGEMENT IPC BRIDGES
// =========================================================

export async function listDesktopStaff(): Promise<DesktopStaffListResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out' }
  }

  try {
    const res = await listStaffHttp(sessionCredential.sessionToken)
    return { ok: true, data: res }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'failed' }
  }
}

export async function createDesktopStaff(
  data: CreateStaffRequest
): Promise<DesktopCreateStaffResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out', message: 'Chưa đăng nhập' }
  }

  try {
    const res = await createStaffHttp(sessionCredential.sessionToken, data)
    return { ok: true, data: res }
  } catch (error) {
    const message =
      error instanceof BackendApiError && error.code === 'username_already_exists'
        ? 'Tên đăng nhập đã tồn tại trong cửa hàng'
        : 'Không thể tạo tài khoản nhân viên'
    return { ok: false, error: 'creation_failed', message }
  }
}

export async function updateDesktopStaff(
  id: string,
  data: UpdateStaffRequest
): Promise<DesktopUpdateStaffResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out' }
  }

  try {
    const res = await updateStaffHttp(sessionCredential.sessionToken, id, data)
    return { ok: true, data: res }
  } catch (error) {
    return { ok: false, error: 'update_failed' }
  }
}

export async function deleteDesktopStaff(id: string): Promise<DesktopDeleteStaffResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out' }
  }

  try {
    await deleteStaffHttp(sessionCredential.sessionToken, id)
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof BackendApiError && error.code === 'cannot_delete_owner'
        ? 'Không thể xóa tài khoản Chủ quán'
        : 'Xóa nhân viên thất bại'
    return { ok: false, error: 'delete_failed', message }
  }
}

// =========================================================
// LOGOUT
// =========================================================

export async function logoutDesktopAuthSession(): Promise<DesktopLogoutResult> {
  const deviceCredential = await loadDeviceCredential().catch(() => null)
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)

  let remoteRevoked = false
  if (sessionCredential) {
    try {
      await logoutAuthSession(deviceCredential, sessionCredential.sessionToken)
      remoteRevoked = true
    } catch {}
  }

  await deleteAuthSessionCredential().catch(() => null)
  currentLoginData = null

  return { ok: true, remoteRevoked }
}

// =========================================================
// LEGACY PIN / PERMISSION METHODS
// =========================================================

export async function getDesktopAuthEmployees(): Promise<DesktopEmployeeListResult> {
  const deviceCredential = await loadDeviceCredential().catch(() => null)
  if (!deviceCredential) {
    return { ok: false, error: 'device_not_ready' }
  }

  try {
    const list = await getAuthEmployees(deviceCredential)
    return { ok: true, value: list }
  } catch {
    return { ok: false, error: 'backend_unavailable' }
  }
}

export async function loginDesktopEmployeeWithPin(
  input: PinLoginRequest
): Promise<DesktopPinLoginResult> {
  const deviceCredential = await loadDeviceCredential().catch(() => null)
  if (!deviceCredential) {
    return { ok: false, error: 'device_not_ready' }
  }

  try {
    const res = await loginEmployeeWithPin(deviceCredential, input)
    await saveAuthSessionCredential({
      sessionToken: res.sessionToken
    })
    return {
      ok: true,
      session: {
        sessionId: res.sessionId,
        expiresAt: res.expiresAt,
        actor: res.actor
      }
    }
  } catch (error) {
    if (error instanceof BackendApiError) {
      if (error.code === 'invalid_employee_or_pin') {
        return { ok: false, error: 'invalid_employee_or_pin' }
      }
      if (error.code === 'pin_not_configured') {
        return { ok: false, error: 'pin_not_configured' }
      }
      if (error.code === 'pin_locked') {
        return { ok: false, error: 'pin_locked', retryAfterSeconds: error.retryAfterSeconds }
      }
    }
    return { ok: false, error: 'backend_unavailable' }
  }
}

export async function getDesktopPermissions(): Promise<DesktopPermissionResult> {
  const deviceCredential = await loadDeviceCredential().catch(() => null)
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)

  if (!sessionCredential) {
    return { ok: false, error: 'signed_out' }
  }

  try {
    const res = await getAuthPermissions(deviceCredential, sessionCredential.sessionToken)
    return { ok: true, value: res }
  } catch {
    return { ok: false, error: 'backend_unavailable' }
  }
}

// =========================================================
// CHANGE PASSWORD & PIN (Admin Settings)
// =========================================================

export async function changeDesktopPassword(
  input: DesktopChangePasswordInput
): Promise<DesktopChangePasswordResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out', message: 'Chưa đăng nhập hệ thống' }
  }

  try {
    const res = await changePasswordHttp(sessionCredential.sessionToken, input)
    return { ok: true, message: res.message || 'Đổi mật khẩu thành công' }
  } catch (error) {
    if (error instanceof BackendApiError && error.code === 'invalid_current_password') {
      return { ok: false, error: 'invalid_current_password', message: 'Mật khẩu hiện tại không chính xác' }
    }
    return { ok: false, error: 'failed', message: 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại dịch vụ.' }
  }
}

export async function changeDesktopPin(
  input: DesktopChangePinInput
): Promise<DesktopChangePinResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out', message: 'Chưa đăng nhập hệ thống' }
  }

  try {
    const res = await changePinHttp(sessionCredential.sessionToken, input)
    return { ok: true, message: res.message || 'Cập nhật mã PIN thành công' }
  } catch (error) {
    if (error instanceof BackendApiError && error.code === 'invalid_current_pin') {
      return { ok: false, error: 'invalid_current_pin', message: 'Mã PIN hiện tại không chính xác' }
    }
    if (error instanceof BackendApiError && error.code === 'invalid_password') {
      return { ok: false, error: 'invalid_password', message: 'Mật khẩu tài khoản không chính xác' }
    }
    return { ok: false, error: 'failed', message: 'Cập nhật mã PIN thất bại. Vui lòng kiểm tra lại dịch vụ.' }
  }
}

// =========================================================
// CATEGORY MANAGEMENT IPC BRIDGES
// =========================================================

export async function listDesktopCategories(): Promise<DesktopCategoryListResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out' }
  }

  try {
    const res = await listCategoriesHttp(sessionCredential.sessionToken)
    return { ok: true, data: res }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'failed' }
  }
}

export async function createDesktopCategory(
  data: CreateCategoryRequest
): Promise<DesktopCreateCategoryResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out', message: 'Chưa đăng nhập' }
  }

  try {
    const res = await createCategoryHttp(sessionCredential.sessionToken, data)
    return { ok: true, data: res }
  } catch (error) {
    const message =
      error instanceof BackendApiError && error.code === 'category_name_already_exists'
        ? 'Tên danh mục đã tồn tại trong cửa hàng'
        : 'Không thể tạo danh mục mới'
    return { ok: false, error: 'creation_failed', message }
  }
}

export async function updateDesktopCategory(
  id: string,
  data: UpdateCategoryRequest
): Promise<DesktopUpdateCategoryResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out', message: 'Chưa đăng nhập' }
  }

  try {
    const res = await updateCategoryHttp(sessionCredential.sessionToken, id, data)
    return { ok: true, data: res }
  } catch (error) {
    const message =
      error instanceof BackendApiError && error.code === 'category_name_already_exists'
        ? 'Tên danh mục bị trùng lặp'
        : 'Không thể cập nhật danh mục'
    return { ok: false, error: 'update_failed', message }
  }
}

export async function deleteDesktopCategory(id: string): Promise<DesktopDeleteCategoryResult> {
  const sessionCredential = await loadAuthSessionCredential().catch(() => null)
  if (!sessionCredential) {
    return { ok: false, error: 'signed_out', message: 'Chưa đăng nhập' }
  }

  try {
    await deleteCategoryHttp(sessionCredential.sessionToken, id)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: 'delete_failed', message: 'Không thể xóa danh mục' }
  }
}


