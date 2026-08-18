import { z } from 'zod'
import { PermissionListSchema } from './permission'

// =========================================================
// BASIC TYPES
// =========================================================

export const UsernameSchema = z
  .string()
  .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
  .max(50, 'Tên đăng nhập tối đa 50 ký tự')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang')

export const PasswordSchema = z
  .string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
  .max(100, 'Mật khẩu tối đa 100 ký tự')

export const Pin4Schema = z
  .string()
  .regex(/^\d{4}$/, 'Mã PIN phải gồm đúng 4 chữ số')

export const RoleTypeSchema = z.enum(['owner', 'manager', 'staff', 'cashier'])
export type RoleType = z.infer<typeof RoleTypeSchema>

// =========================================================
// LOGIN REQUEST & RESPONSE
// =========================================================

export const PasswordLoginRequestSchema = z
  .object({
    username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
    roleType: RoleTypeSchema.optional()
  })
  .strict()

export type PasswordLoginRequest = z.infer<typeof PasswordLoginRequestSchema>

export const VerifyPinRequestSchema = z
  .object({
    pin: Pin4Schema
  })
  .strict()

export type VerifyPinRequest = z.infer<typeof VerifyPinRequestSchema>

export const VerifyPinResponseSchema = z
  .object({
    ok: z.boolean(),
    message: z.string().optional()
  })
  .strict()

export type VerifyPinResponse = z.infer<typeof VerifyPinResponseSchema>

// Store summary in session
export const StoreSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  currency: z.string().default('VND')
})

export type StoreSummary = z.infer<typeof StoreSummarySchema>

// Authenticated Actor
export const AuthenticatedUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  roleCode: z.string().min(1),
  roleName: z.string().min(1),
  hasPin: z.boolean().default(true),
  permissions: PermissionListSchema.optional()
})

export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>

export const LoginResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string().uuid(),
  sessionToken: z.string().min(1),
  expiresAt: z.string().min(1),
  store: StoreSummarySchema,
  user: AuthenticatedUserSchema
})

export type LoginResponse = z.infer<typeof LoginResponseSchema>

// =========================================================
// STAFF MANAGEMENT CONTRACTS
// =========================================================

export const StaffItemSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  roleCode: z.string().min(1),
  roleName: z.string().min(1),
  status: z.enum(['active', 'disabled']),
  hasPin: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type StaffItem = z.infer<typeof StaffItemSchema>

export const StaffListResponseSchema = z.object({
  ok: z.literal(true),
  staff: z.array(StaffItemSchema)
})

export type StaffListResponse = z.infer<typeof StaffListResponseSchema>

export const CreateStaffRequestSchema = z
  .object({
    displayName: z.string().min(2, 'Họ và tên bắt buộc (ít nhất 2 ký tự)'),
    username: UsernameSchema,
    password: PasswordSchema,
    pin: Pin4Schema,
    email: z.string().email('Email không hợp lệ').nullable().optional().or(z.literal('')),
    phone: z.string().regex(/^[0-9+() -]{8,20}$/, 'Số điện thoại không hợp lệ').nullable().optional().or(z.literal('')),
    roleCode: z.enum(['manager', 'staff', 'cashier']).default('staff')
  })
  .strict()

export type CreateStaffRequest = z.infer<typeof CreateStaffRequestSchema>

export const DeleteStaffResponseSchema = z.object({
  ok: z.literal(true)
})

export type DeleteStaffResponse = z.infer<typeof DeleteStaffResponseSchema>

// =========================================================
// CREDENTIAL MANAGEMENT (PASSWORD & PIN CHANGE)
// =========================================================

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: PasswordSchema
  })
  .strict()

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>

export const ChangePinRequestSchema = z
  .object({
    currentPin: Pin4Schema.optional(),
    verifyPassword: z.string().optional(),
    newPin: Pin4Schema
  })
  .strict()

export type ChangePinRequest = z.infer<typeof ChangePinRequestSchema>

export const ChangeCredentialResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional()
})

export type ChangeCredentialResponse = z.infer<typeof ChangeCredentialResponseSchema>

export const UpdateStaffRequestSchema = z
  .object({
    displayName: z.string().min(2).optional(),
    password: PasswordSchema.optional(),
    pin: Pin4Schema.optional(),
    email: z.string().email().nullable().optional().or(z.literal('')),
    phone: z.string().nullable().optional().or(z.literal('')),
    roleCode: z.enum(['manager', 'staff', 'cashier']).optional(),
    status: z.enum(['active', 'disabled']).optional()
  })
  .strict()

export type UpdateStaffRequest = z.infer<typeof UpdateStaffRequestSchema>
