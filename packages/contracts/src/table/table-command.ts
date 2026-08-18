import {
  z
} from 'zod'

import {
  CommandEnvelopeSchema
} from '../commands/command-envelope'

import {
  TableColorHexSchema,
  TableConfigStatusSchema,
  TableNameSchema
} from './table'


// =========================================================
// COMMAND TYPES
// =========================================================

export const TABLE_MANAGEMENT_COMMAND_TYPES = {
  createTableType:
    'CreateTableType',

  updateTableTypeDetails:
    'UpdateTableTypeDetails',

  setTableTypeStatus:
    'SetTableTypeStatus',

  reorderTableTypes:
    'ReorderTableTypes',

  createBilliardTable:
    'CreateBilliardTable',

  updateBilliardTableDetails:
    'UpdateBilliardTableDetails',

  setBilliardTableStatus:
    'SetBilliardTableStatus',

  reorderBilliardTables:
    'ReorderBilliardTables'
} as const


// =========================================================
// UNIQUE UUID ORDER LIST
// =========================================================

const UniqueEntityOrderSchema =
  z.array(
    z.string().uuid()
  )
    .min(1)
    .max(500)

    .superRefine(
      (
        ids,
        ctx
      ) => {
        const seen =
          new Set<string>()

        ids.forEach(
          (
            id,
            index
          ) => {
            if (
              seen.has(id)
            ) {
              ctx.addIssue({
                code:
                  'custom',

                message:
                  'duplicate_entity_id',

                path: [
                  index
                ]
              })

              return
            }

            seen.add(id)
          }
        )
      }
    )


// =========================================================
// CREATE TABLE TYPE
//
// Entity ID is client-generated UUID.
//
// This is NOT Store authority.
// It is a Store-scoped business reference and will be
// validated/routed only after trusted Store context exists.
//
// Client cannot choose sortOrder.
// New entities are appended server-side.
// =========================================================

const CreateTableTypePayloadSchema =
  z.object({
    tableTypeId:
      z.string().uuid(),

    name:
      TableNameSchema,

    colorHex:
      TableColorHexSchema
  })
    .strict()


export const CreateTableTypeCommandSchema =
  CommandEnvelopeSchema
    .extend({
      commandType:
        z.literal(
          TABLE_MANAGEMENT_COMMAND_TYPES
            .createTableType
        ),

      payload:
        CreateTableTypePayloadSchema
    })


export type CreateTableTypeCommand =
  z.infer<
    typeof CreateTableTypeCommandSchema
  >


// =========================================================
// UPDATE TABLE TYPE DETAILS
//
// Status and ordering deliberately excluded.
// They have their own commands.
// =========================================================

const UpdateTableTypeDetailsPayloadSchema =
  z.object({
    tableTypeId:
      z.string().uuid(),

    name:
      TableNameSchema,

    colorHex:
      TableColorHexSchema
  })
    .strict()


export const UpdateTableTypeDetailsCommandSchema =
  CommandEnvelopeSchema
    .extend({
      commandType:
        z.literal(
          TABLE_MANAGEMENT_COMMAND_TYPES
            .updateTableTypeDetails
        ),

      payload:
        UpdateTableTypeDetailsPayloadSchema
    })


// =========================================================
// TABLE TYPE STATUS
// =========================================================

const SetTableTypeStatusPayloadSchema =
  z.object({
    tableTypeId:
      z.string().uuid(),

    status:
      TableConfigStatusSchema
  })
    .strict()


export const SetTableTypeStatusCommandSchema =
  CommandEnvelopeSchema
    .extend({
      commandType:
        z.literal(
          TABLE_MANAGEMENT_COMMAND_TYPES
            .setTableTypeStatus
        ),

      payload:
        SetTableTypeStatusPayloadSchema
    })


// =========================================================
// TABLE TYPE REORDER
// =========================================================

const ReorderTableTypesPayloadSchema =
  z.object({
    orderedTableTypeIds:
      UniqueEntityOrderSchema
  })
    .strict()


export const ReorderTableTypesCommandSchema =
  CommandEnvelopeSchema
    .extend({
      commandType:
        z.literal(
          TABLE_MANAGEMENT_COMMAND_TYPES
            .reorderTableTypes
        ),

      payload:
        ReorderTableTypesPayloadSchema
    })


// =========================================================
// CREATE BILLIARD TABLE
//
// Client provides a UUID so future offline/outbox commands
// can reference a newly-created entity deterministically.
//
// It is NOT trusted Store identity.
// =========================================================

const CreateBilliardTablePayloadSchema =
  z.object({
    tableId:
      z.string().uuid(),

    tableTypeId:
      z.string().uuid(),

    name:
      TableNameSchema
  })
    .strict()


export const CreateBilliardTableCommandSchema =
  CommandEnvelopeSchema
    .extend({
      commandType:
        z.literal(
          TABLE_MANAGEMENT_COMMAND_TYPES
            .createBilliardTable
        ),

      payload:
        CreateBilliardTablePayloadSchema
    })


// =========================================================
// UPDATE BILLIARD TABLE DETAILS
//
// Table type may be changed here.
//
// M1.5 will add:
// active TableSession → type cannot be changed.
// =========================================================

const UpdateBilliardTableDetailsPayloadSchema =
  z.object({
    tableId:
      z.string().uuid(),

    tableTypeId:
      z.string().uuid(),

    name:
      TableNameSchema
  })
    .strict()


export const UpdateBilliardTableDetailsCommandSchema =
  CommandEnvelopeSchema
    .extend({
      commandType:
        z.literal(
          TABLE_MANAGEMENT_COMMAND_TYPES
            .updateBilliardTableDetails
        ),

      payload:
        UpdateBilliardTableDetailsPayloadSchema
    })


// =========================================================
// BILLIARD TABLE STATUS
// =========================================================

const SetBilliardTableStatusPayloadSchema =
  z.object({
    tableId:
      z.string().uuid(),

    status:
      TableConfigStatusSchema
  })
    .strict()


export const SetBilliardTableStatusCommandSchema =
  CommandEnvelopeSchema
    .extend({
      commandType:
        z.literal(
          TABLE_MANAGEMENT_COMMAND_TYPES
            .setBilliardTableStatus
        ),

      payload:
        SetBilliardTableStatusPayloadSchema
    })


// =========================================================
// BILLIARD TABLE REORDER
// =========================================================

const ReorderBilliardTablesPayloadSchema =
  z.object({
    orderedTableIds:
      UniqueEntityOrderSchema
  })
    .strict()


export const ReorderBilliardTablesCommandSchema =
  CommandEnvelopeSchema
    .extend({
      commandType:
        z.literal(
          TABLE_MANAGEMENT_COMMAND_TYPES
            .reorderBilliardTables
        ),

      payload:
        ReorderBilliardTablesPayloadSchema
    })


// =========================================================
// TABLE MANAGEMENT COMMAND UNION
//
// Worker will use this to reject unknown/mismatched
// table-management commands before executing business logic.
// =========================================================

export const TableManagementCommandSchema =
  z.discriminatedUnion(
    'commandType',
    [
      CreateTableTypeCommandSchema,

      UpdateTableTypeDetailsCommandSchema,

      SetTableTypeStatusCommandSchema,

      ReorderTableTypesCommandSchema,

      CreateBilliardTableCommandSchema,

      UpdateBilliardTableDetailsCommandSchema,

      SetBilliardTableStatusCommandSchema,

      ReorderBilliardTablesCommandSchema
    ]
  )


export type TableManagementCommand =
  z.infer<
    typeof TableManagementCommandSchema
  >