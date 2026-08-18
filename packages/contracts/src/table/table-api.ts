import {
  z
} from 'zod'


export const TABLE_COMMAND_BUSINESS_ERRORS = [
  'table_type_id_conflict',
  'table_type_name_conflict',
  'table_type_not_found',
  'table_type_disabled',
  'table_type_has_active_tables',
  'table_type_reorder_mismatch',

  'table_id_conflict',
  'table_name_conflict',
  'table_not_found',
  'table_reorder_mismatch'
] as const


export const TableCommandBusinessErrorSchema =
  z.enum(
    TABLE_COMMAND_BUSINESS_ERRORS
  )


export type TableCommandBusinessError =
  z.infer<
    typeof TableCommandBusinessErrorSchema
  >


export const TableManagementCommandTypeSchema =
  z.enum([
    'CreateTableType',
    'UpdateTableTypeDetails',
    'SetTableTypeStatus',
    'ReorderTableTypes',

    'CreateBilliardTable',
    'UpdateBilliardTableDetails',
    'SetBilliardTableStatus',
    'ReorderBilliardTables'
  ])


export type TableManagementCommandType =
  z.infer<
    typeof TableManagementCommandTypeSchema
  >


export const TableCommandSuccessResponseSchema =
  z.object({
    ok:
      z.literal(true),

    replayed:
      z.boolean(),

    commandId:
      z.string().uuid(),

    commandType:
      TableManagementCommandTypeSchema
  })
    .strict()


export const TableCommandRejectedResponseSchema =
  z.object({
    ok:
      z.literal(false),

    replayed:
      z.boolean(),

    commandId:
      z.string().uuid(),

    commandType:
      TableManagementCommandTypeSchema,

    error:
      TableCommandBusinessErrorSchema
  })
    .strict()


export const TableCommandConflictResponseSchema =
  z.object({
    ok:
      z.literal(false),

    replayed:
      z.literal(false),

    error:
      z.literal(
        'command_id_conflict'
      )
  })
    .strict()


export const TableCommandApiResponseSchema =
  z.union([
    TableCommandSuccessResponseSchema,
    TableCommandRejectedResponseSchema,
    TableCommandConflictResponseSchema
  ])


export type TableCommandApiResponse =
  z.infer<
    typeof TableCommandApiResponseSchema
  >


export const TableApiRequestErrorSchema =
  z.object({
    ok:
      z.literal(false),

    error:
      z.enum([
        'invalid_json',
        'invalid_table_command',
        'table_service_unavailable'
      ])
  })
    .strict()


export type TableApiRequestError =
  z.infer<
    typeof TableApiRequestErrorSchema
  >