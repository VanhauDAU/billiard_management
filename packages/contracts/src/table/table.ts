import {
  z
} from 'zod'


// =========================================================
// CONSTANTS
// =========================================================

export const TABLE_NAME_MAX_LENGTH =
  80


// =========================================================
// NAME NORMALIZATION
//
// Client never supplies name_normalized.
//
// Display:
// Unicode NFKC
// → trim
// → collapse whitespace
//
// Unique key:
// canonical display
// → Vietnamese lowercase
// =========================================================

const UNSAFE_NAME_CHARACTERS =
  /[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/u


export function normalizeTableDisplayName(
  value:
    string
): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(
      /\s+/gu,
      ' '
    )
}


export function normalizeTableNameKey(
  value:
    string
): string {
  return normalizeTableDisplayName(
    value
  )
    .toLocaleLowerCase(
      'vi-VN'
    )
}


// =========================================================
// NAME
// =========================================================

export const TableNameSchema =
  z.string()
    /*
     * Protect transformation from an
     * unnecessarily large client string.
     */
    .max(256)

    .transform(
      normalizeTableDisplayName
    )

    .pipe(
      z.string()
        .min(1)
        .max(
          TABLE_NAME_MAX_LENGTH
        )

        .refine(
          (
            value
          ) =>
            !UNSAFE_NAME_CHARACTERS
              .test(value),

          {
            message:
              'invalid_table_name'
          }
        )
    )


export type TableName =
  z.infer<
    typeof TableNameSchema
  >


// =========================================================
// COLOR
//
// Accepted:
// #2563EB
// #2563eb
//
// Parsed output is always:
// #2563EB
// =========================================================

export const TableColorHexSchema =
  z.string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/
    )

    .transform(
      (
        value
      ) =>
        value.toUpperCase()
    )


export type TableColorHex =
  z.infer<
    typeof TableColorHexSchema
  >


// =========================================================
// CONFIGURATION STATUS
//
// available/playing are NOT persisted master states.
//
// They will be derived from TableSession in M1.5.
// =========================================================

export const TableConfigStatusSchema =
  z.enum([
    'active',
    'disabled'
  ])


export type TableConfigStatus =
  z.infer<
    typeof TableConfigStatusSchema
  >


// =========================================================
// TABLE TYPE VIEW
//
// Safe Store-scoped API/UI representation.
//
// name_normalized is deliberately not exposed.
// =========================================================

export const TableTypeViewSchema =
  z.object({
    id:
      z.string().uuid(),

    name:
      TableNameSchema,

    colorHex:
      TableColorHexSchema,

    status:
      TableConfigStatusSchema,

    sortOrder:
      z.number()
        .int()
        .nonnegative()
  })
    .strict()


export type TableTypeView =
  z.infer<
    typeof TableTypeViewSchema
  >


// =========================================================
// BILLIARD TABLE VIEW
// =========================================================

export const BilliardTableViewSchema =
  z.object({
    id:
      z.string().uuid(),

    tableTypeId:
      z.string().uuid(),

    name:
      TableNameSchema,

    status:
      TableConfigStatusSchema,

    sortOrder:
      z.number()
        .int()
        .nonnegative()
  })
    .strict()


export type BilliardTableView =
  z.infer<
    typeof BilliardTableViewSchema
  >


// =========================================================
// CONFIGURATION SNAPSHOT
//
// Initial M1.4 read model.
//
// No pricing.
// No TableSession.
// No playing/available persisted state.
// =========================================================

export const TableConfigurationResponseSchema =
  z.object({
    tableTypes:
      z.array(
        TableTypeViewSchema
      ),

    tables:
      z.array(
        BilliardTableViewSchema
      )
  })
    .strict()


export type TableConfigurationResponse =
  z.infer<
    typeof TableConfigurationResponseSchema
  >