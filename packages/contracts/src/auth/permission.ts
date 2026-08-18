import { z } from 'zod'

export const PERMISSION_KEYS = [
  // Tables & POS
  'table.view',
  'table.open',
  'table.transfer',
  'table.manage',
  'table.order',
  'session.adjust_time',

  // Invoices
  'invoices.view',
  'invoices.delete',
  'invoices.export',
  'invoices.cancel',
  'invoices.print',

  // Products / Items
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'products.import_export',

  // Menus
  'menus.view',
  'menus.create',
  'menus.edit',
  'menus.delete',

  // Categories
  'categories.view',
  'categories.create',
  'categories.edit',
  'categories.delete',

  // Customers & Debt
  'customers.view',
  'customers.create',
  'customers.edit_debt',
  'customers.delete',
  'customers.import_export',
  'customers.groups.view',
  'customers.groups.manage',

  // Staff & Settings
  'staff.manage',
  'role.manage',
  'report.view',
  'print.template.manage',
  'store.settings.manage',

  // Backward compatibility alias keys
  'product.view',
  'product.add_to_bill',
  'product.remove_item',
  'product.manage',
  'pricing.manage',
  'bill.view',
  'bill.merge',
  'bill.pay',
  'employee.manage'
] as const

export const PermissionKeySchema = z.enum(PERMISSION_KEYS)

export type PermissionKey = z.infer<typeof PermissionKeySchema>

export const PermissionListSchema = z.array(PermissionKeySchema)

export type PermissionList = z.infer<typeof PermissionListSchema>

export const PermissionContextResponseSchema = z
  .object({
    permissions: PermissionListSchema
  })
  .strict()

export type PermissionContextResponse = z.infer<typeof PermissionContextResponseSchema>