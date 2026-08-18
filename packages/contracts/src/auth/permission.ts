import { z } from 'zod'


export const PERMISSION_KEYS = [
  'table.view',
  'table.open',
  'table.transfer',
  'table.manage',

  'session.adjust_time',

  'product.view',
  'product.add_to_bill',
  'product.remove_item',
  'product.manage',

  'pricing.manage',

  'bill.view',
  'bill.merge',
  'bill.pay',

  'employee.manage',
  'role.manage',

  'report.view',

  'print.template.manage',

  'store.settings.manage'
] as const


export const PermissionKeySchema =
  z.enum(PERMISSION_KEYS)


export type PermissionKey =
  z.infer<
    typeof PermissionKeySchema
  >


export const PermissionListSchema =
  z.array(
    PermissionKeySchema
  )


export type PermissionList =
  z.infer<
    typeof PermissionListSchema
  >


export const PermissionContextResponseSchema =
  z.object({
    permissions:
      PermissionListSchema
  })
    .strict()


export type PermissionContextResponse =
  z.infer<
    typeof PermissionContextResponseSchema
  >