import {
  TableManagementCommandSchema,
  normalizeTableNameKey
} from '@billiards/contracts'

import type {
  TableManagementCommand
} from '@billiards/contracts'

import {
  createTableCommandFingerprint
} from './table-command-fingerprint'

import {
  parseStoredTableCommandResult
} from './table-command-result'

import type {
  TableCommandBusinessError
} from '@billiards/contracts'

import type {
  TableCommandRpcResult,
  TableCommandStoredResult
} from './table-command-result'
import {
  StoreTableCommandRepository
} from './store-table-command-repository'


export type StoreTableCommandExecutionContext = {
  storeId:
    string

  actorId:
    string

  deviceId:
    string
}


function isValidExecutionContext(
  context:
    StoreTableCommandExecutionContext
): boolean {
  return (
    typeof context.storeId ===
      'string' &&

    context.storeId.length > 0 &&

    typeof context.actorId ===
      'string' &&

    context.actorId.length > 0 &&

    typeof context.deviceId ===
      'string' &&

    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(
        context.deviceId
      )
  )
}


function success(
  command:
    TableManagementCommand
): TableCommandStoredResult {
  return {
    ok: true,

    commandId:
      command.commandId,

    commandType:
      command.commandType
  }
}


function reject(
  command:
    TableManagementCommand,

  error:
    TableCommandBusinessError
): TableCommandStoredResult {
  return {
    ok: false,

    commandId:
      command.commandId,

    commandType:
      command.commandType,

    error
  }
}


function isExactSet(
  existing:
    readonly string[],

  requested:
    readonly string[]
): boolean {
  if (
    existing.length !==
      requested.length
  ) {
    return false
  }


  const requestedSet =
    new Set(
      requested
    )


  return existing.every(
    (
      id
    ) =>
      requestedSet.has(
        id
      )
  )
}


export class StoreTableCommandExecutor {
  constructor(
    private readonly storage:
      DurableObjectStorage,

    private readonly repository:
      StoreTableCommandRepository
  ) {}


  async execute(
    context:
      StoreTableCommandExecutionContext,

    input:
      unknown
  ): Promise<TableCommandRpcResult> {
    if (
      !isValidExecutionContext(
        context
      )
    ) {
      return {
        ok: false,
        replayed: false,

        error:
          'invalid_execution_context'
      }
    }


    /*
     * Parse again at the Store DO boundary.
     *
     * Worker parsing later in M1.4-D is not
     * a reason to trust a deserialized RPC
     * payload implicitly.
     */
    const parsed =
      TableManagementCommandSchema
        .safeParse(
          input
        )


    if (
      !parsed.success
    ) {
      return {
        ok: false,
        replayed: false,

        error:
          'invalid_table_command'
      }
    }


    const command =
      parsed.data


    /*
     * Crypto is async, so it must happen
     * outside transactionSync().
     */
    const fingerprint =
      await createTableCommandFingerprint(
        command
      )


    return this.storage
      .transactionSync(
        () => {
          const existing =
            this.repository
              .getProcessedCommand(
                command.commandId
              )


          if (
            existing
          ) {
            if (
              existing.command_type !==
                command.commandType ||

              existing.request_fingerprint !==
                fingerprint ||

              existing.actor_id !==
                context.actorId ||

              existing.device_id !==
                context.deviceId
            ) {
              return {
                ok: false,
                replayed: false,

                error:
                  'command_id_conflict'
              }
            }


            const stored =
              parseStoredTableCommandResult(
                existing.result_json
              )


            if (
              stored.commandId !==
                command.commandId ||

              stored.commandType !==
                command.commandType
            ) {
              throw new Error(
                'processed_command_result_corrupt'
              )
            }


            return {
              ...stored,
              replayed: true
            }
          }


          const result =
            this.apply(
              command
            )


          this.repository
            .insertProcessedCommand({
              commandId:
                command.commandId,

              commandType:
                command.commandType,

              requestFingerprint:
                fingerprint,

              actorId:
                context.actorId,

              deviceId:
                context.deviceId,

              clientIssuedAt:
                command.issuedAt,

              outcomeKind:
                result.ok
                  ? 'success'
                  : 'rejected',

              resultJson:
                JSON.stringify(
                  result
                )
            })


          return {
            ...result,
            replayed: false
          }
        }
      )
  }


  private apply(
    command:
      TableManagementCommand
  ): TableCommandStoredResult {
    switch (
      command.commandType
    ) {
      case 'CreateTableType': {
        const {
          tableTypeId,
          name,
          colorHex
        } =
          command.payload


        if (
          this.repository
            .tableTypeIdExists(
              tableTypeId
            )
        ) {
          return reject(
            command,
            'table_type_id_conflict'
          )
        }


        const nameNormalized =
          normalizeTableNameKey(
            name
          )


        if (
          this.repository
            .tableTypeNameExists(
              nameNormalized
            )
        ) {
          return reject(
            command,
            'table_type_name_conflict'
          )
        }


        this.repository
          .createTableType({
            id:
              tableTypeId,

            name,

            nameNormalized,

            colorHex
          })


        return success(
          command
        )
      }


      case 'UpdateTableTypeDetails': {
        const {
          tableTypeId,
          name,
          colorHex
        } =
          command.payload


        if (
          !this.repository
            .getTableType(
              tableTypeId
            )
        ) {
          return reject(
            command,
            'table_type_not_found'
          )
        }


        const nameNormalized =
          normalizeTableNameKey(
            name
          )


        if (
          this.repository
            .tableTypeNameExists(
              nameNormalized,
              tableTypeId
            )
        ) {
          return reject(
            command,
            'table_type_name_conflict'
          )
        }


        this.repository
          .updateTableTypeDetails({
            id:
              tableTypeId,

            name,

            nameNormalized,

            colorHex
          })


        return success(
          command
        )
      }


      case 'SetTableTypeStatus': {
        const {
          tableTypeId,
          status
        } =
          command.payload


        const tableType =
          this.repository
            .getTableType(
              tableTypeId
            )


        if (
          !tableType
        ) {
          return reject(
            command,
            'table_type_not_found'
          )
        }


        if (
          tableType.status ===
            status
        ) {
          return success(
            command
          )
        }


        if (
          status ===
            'disabled' &&

          this.repository
            .countActiveTablesForType(
              tableTypeId
            ) > 0
        ) {
          return reject(
            command,
            'table_type_has_active_tables'
          )
        }


        this.repository
          .setTableTypeStatus(
            tableTypeId,
            status
          )


        return success(
          command
        )
      }


      case 'ReorderTableTypes': {
        const requested =
          command.payload
            .orderedTableTypeIds

        const existing =
          this.repository
            .listTableTypeIds()


        if (
          !isExactSet(
            existing,
            requested
          )
        ) {
          return reject(
            command,
            'table_type_reorder_mismatch'
          )
        }


        this.repository
          .reorderTableTypes(
            requested
          )


        return success(
          command
        )
      }


      case 'CreateBilliardTable': {
        const {
          tableId,
          tableTypeId,
          name
        } =
          command.payload


        if (
          this.repository
            .tableIdExists(
              tableId
            )
        ) {
          return reject(
            command,
            'table_id_conflict'
          )
        }


        const tableType =
          this.repository
            .getTableType(
              tableTypeId
            )


        if (
          !tableType
        ) {
          return reject(
            command,
            'table_type_not_found'
          )
        }


        if (
          tableType.status !==
            'active'
        ) {
          return reject(
            command,
            'table_type_disabled'
          )
        }


        const nameNormalized =
          normalizeTableNameKey(
            name
          )


        if (
          this.repository
            .tableNameExists(
              nameNormalized
            )
        ) {
          return reject(
            command,
            'table_name_conflict'
          )
        }


        this.repository
          .createTable({
            id:
              tableId,

            tableTypeId,

            name,

            nameNormalized
          })


        return success(
          command
        )
      }


      case 'UpdateBilliardTableDetails': {
        const {
          tableId,
          tableTypeId,
          name
        } =
          command.payload


        const table =
          this.repository
            .getTable(
              tableId
            )


        if (
          !table
        ) {
          return reject(
            command,
            'table_not_found'
          )
        }


        const targetType =
          this.repository
            .getTableType(
              tableTypeId
            )


        if (
          !targetType
        ) {
          return reject(
            command,
            'table_type_not_found'
          )
        }


        /*
         * A disabled table may remain linked to
         * its already-disabled type and still
         * have its name edited.
         *
         * Moving to another disabled type is
         * not permitted.
         */
        if (
          table.table_type_id !==
            tableTypeId &&

          targetType.status !==
            'active'
        ) {
          return reject(
            command,
            'table_type_disabled'
          )
        }


        const nameNormalized =
          normalizeTableNameKey(
            name
          )


        if (
          this.repository
            .tableNameExists(
              nameNormalized,
              tableId
            )
        ) {
          return reject(
            command,
            'table_name_conflict'
          )
        }


        this.repository
          .updateTableDetails({
            id:
              tableId,

            tableTypeId,

            name,

            nameNormalized
          })


        return success(
          command
        )
      }


      case 'SetBilliardTableStatus': {
        const {
          tableId,
          status
        } =
          command.payload


        const table =
          this.repository
            .getTable(
              tableId
            )


        if (
          !table
        ) {
          return reject(
            command,
            'table_not_found'
          )
        }


        if (
          status ===
            'active'
        ) {
          const tableType =
            this.repository
              .getTableType(
                table.table_type_id
              )


          if (
            !tableType
          ) {
            return reject(
              command,
              'table_type_not_found'
            )
          }


          if (
            tableType.status !==
              'active'
          ) {
            return reject(
              command,
              'table_type_disabled'
            )
          }
        }


        if (
          table.status !==
            status
        ) {
          this.repository
            .setTableStatus(
              tableId,
              status
            )
        }


        return success(
          command
        )
      }


      case 'ReorderBilliardTables': {
        const requested =
          command.payload
            .orderedTableIds

        const existing =
          this.repository
            .listTableIds()


        if (
          !isExactSet(
            existing,
            requested
          )
        ) {
          return reject(
            command,
            'table_reorder_mismatch'
          )
        }


        this.repository
          .reorderTables(
            requested
          )


        return success(
          command
        )
      }
    }
  }
}