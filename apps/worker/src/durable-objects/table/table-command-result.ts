import {
  TABLE_MANAGEMENT_COMMAND_TYPES
} from '@billiards/contracts'

import {
  TABLE_COMMAND_BUSINESS_ERRORS
} from '@billiards/contracts'

import type {
  TableCommandBusinessError,
  TableManagementCommand
} from '@billiards/contracts'

export type TableCommandType =
  TableManagementCommand['commandType']


export type TableCommandStoredResult =
  | {
      ok: true
      commandId: string
      commandType: TableCommandType
    }
  | {
      ok: false
      commandId: string
      commandType: TableCommandType
      error: TableCommandBusinessError
    }


export type TableCommandRpcResult =
  | (
      TableCommandStoredResult & {
        replayed: boolean
      }
    )
  | {
      ok: false
      replayed: false
      error:
        | 'invalid_execution_context'
        | 'invalid_table_command'
        | 'command_id_conflict'
    }


const COMMAND_TYPES =
  new Set<string>(
    Object.values(
      TABLE_MANAGEMENT_COMMAND_TYPES
    )
  )


const BUSINESS_ERRORS =
  new Set<string>(
    TABLE_COMMAND_BUSINESS_ERRORS
  )


export function parseStoredTableCommandResult(
  value: string
): TableCommandStoredResult {
  const parsed =
    JSON.parse(
      value
    ) as unknown


  if (
    typeof parsed !== 'object' ||
    parsed === null
  ) {
    throw new Error(
      'processed_command_result_corrupt'
    )
  }


  const row =
    parsed as Record<
      string,
      unknown
    >


  if (
    typeof row.commandId !==
      'string' ||

    typeof row.commandType !==
      'string' ||

    !COMMAND_TYPES.has(
      row.commandType
    )
  ) {
    throw new Error(
      'processed_command_result_corrupt'
    )
  }


  if (
    row.ok === true
  ) {
    return {
      ok: true,

      commandId:
        row.commandId,

      commandType:
        row.commandType as
          TableCommandType
    }
  }


  if (
    row.ok === false &&

    typeof row.error ===
      'string' &&

    BUSINESS_ERRORS.has(
      row.error
    )
  ) {
    return {
      ok: false,

      commandId:
        row.commandId,

      commandType:
        row.commandType as
          TableCommandType,

      error:
        row.error as
          TableCommandBusinessError
    }
  }


  throw new Error(
    'processed_command_result_corrupt'
  )
}