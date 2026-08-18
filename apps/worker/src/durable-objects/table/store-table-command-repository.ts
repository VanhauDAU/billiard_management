type ProcessedCommandRow = {
  command_id: string
  command_type: string
  request_fingerprint: string

  actor_id: string
  device_id: string

  result_json: string
}


type TableTypeRow = {
  id: string
  status: string
}


type TableRow = {
  id: string
  table_type_id: string
  status: string
}


export class StoreTableCommandRepository {
  constructor(
    private readonly sql:
      SqlStorage
  ) {}


  getProcessedCommand(
    commandId: string
  ): ProcessedCommandRow | undefined {
    return this.sql
      .exec<ProcessedCommandRow>(
        `
          SELECT
            command_id,
            command_type,
            request_fingerprint,
            actor_id,
            device_id,
            result_json

          FROM processed_commands

          WHERE
            command_id = ?

          LIMIT 1
        `,

        commandId
      )
      .toArray()[0]
  }


  insertProcessedCommand(
    input: {
      commandId: string

      commandType: string

      requestFingerprint:
        string

      actorId: string
      deviceId: string

      clientIssuedAt:
        string

      outcomeKind:
        'success' | 'rejected'

      resultJson: string
    }
  ): void {
    this.sql.exec(
      `
        INSERT INTO processed_commands (
          command_id,
          command_type,
          request_fingerprint,

          actor_id,
          device_id,

          client_issued_at,

          outcome_kind,
          result_json
        )

        VALUES (
          ?,
          ?,
          ?,

          ?,
          ?,

          ?,

          ?,
          ?
        )
      `,

      input.commandId,
      input.commandType,
      input.requestFingerprint,

      input.actorId,
      input.deviceId,

      input.clientIssuedAt,

      input.outcomeKind,
      input.resultJson
    )
  }


  tableTypeIdExists(
    id: string
  ): boolean {
    const row =
      this.sql
        .exec<{
          found:
            number
        }>(
          `
            SELECT
              1 AS found

            FROM table_types

            WHERE
              id = ?

            LIMIT 1
          `,

          id
        )
        .toArray()[0]


    return (
      row?.found === 1
    )
  }


  tableTypeNameExists(
    nameNormalized:
      string,

    excludingId?:
      string
  ): boolean {
    if (
      excludingId
    ) {
      return Boolean(
        this.sql
          .exec(
            `
              SELECT id

              FROM table_types

              WHERE
                name_normalized = ?

                AND id <> ?

              LIMIT 1
            `,

            nameNormalized,
            excludingId
          )
          .toArray()[0]
      )
    }


    return Boolean(
      this.sql
        .exec(
          `
            SELECT id

            FROM table_types

            WHERE
              name_normalized = ?

            LIMIT 1
          `,

          nameNormalized
        )
        .toArray()[0]
    )
  }


  getTableType(
    id: string
  ): TableTypeRow | undefined {
    return this.sql
      .exec<TableTypeRow>(
        `
          SELECT
            id,
            status

          FROM table_types

          WHERE
            id = ?

          LIMIT 1
        `,

        id
      )
      .toArray()[0]
  }


  countActiveTablesForType(
    tableTypeId:
      string
  ): number {
    const row =
      this.sql
        .exec<{
          count:
            number
        }>(
          `
            SELECT
              COUNT(*) AS count

            FROM billiard_tables

            WHERE
              table_type_id = ?

              AND status =
                'active'
          `,

          tableTypeId
        )
        .toArray()[0]


    return Number(
      row?.count ?? 0
    )
  }


  createTableType(
    input: {
      id: string
      name: string
      nameNormalized: string
      colorHex: string
    }
  ): void {
    this.sql.exec(
      `
        INSERT INTO table_types (
          id,
          name,
          name_normalized,
          color_hex,
          sort_order
        )

        SELECT
          ?,
          ?,
          ?,
          ?,

          COALESCE(
            MAX(sort_order) + 1,
            0
          )

        FROM table_types
      `,

      input.id,
      input.name,
      input.nameNormalized,
      input.colorHex
    )
  }


  updateTableTypeDetails(
    input: {
      id: string
      name: string
      nameNormalized: string
      colorHex: string
    }
  ): void {
    this.sql.exec(
      `
        UPDATE table_types

        SET
          name = ?,
          name_normalized = ?,
          color_hex = ?,
          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          id = ?
      `,

      input.name,
      input.nameNormalized,
      input.colorHex,
      input.id
    )
  }


  setTableTypeStatus(
    id: string,
    status:
      'active' | 'disabled'
  ): void {
    this.sql.exec(
      `
        UPDATE table_types

        SET
          status = ?,
          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          id = ?
      `,

      status,
      id
    )
  }


  listTableTypeIds():
  string[] {
    return this.sql
      .exec<{
        id:
          string
      }>(`
        SELECT id

        FROM table_types
      `)
      .toArray()
      .map(
        (
          row
        ) =>
          row.id
      )
  }


  reorderTableTypes(
    ids:
      readonly string[]
  ): void {
    ids.forEach(
      (
        id,
        index
      ) => {
        this.sql.exec(
          `
            UPDATE table_types

            SET
              sort_order = ?,
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              id = ?
          `,

          index,
          id
        )
      }
    )
  }


  tableIdExists(
    id: string
  ): boolean {
    return Boolean(
      this.getTable(
        id
      )
    )
  }


  tableNameExists(
    nameNormalized:
      string,

    excludingId?:
      string
  ): boolean {
    if (
      excludingId
    ) {
      return Boolean(
        this.sql
          .exec(
            `
              SELECT id

              FROM billiard_tables

              WHERE
                name_normalized = ?

                AND id <> ?

              LIMIT 1
            `,

            nameNormalized,
            excludingId
          )
          .toArray()[0]
      )
    }


    return Boolean(
      this.sql
        .exec(
          `
            SELECT id

            FROM billiard_tables

            WHERE
              name_normalized = ?

            LIMIT 1
          `,

          nameNormalized
        )
        .toArray()[0]
    )
  }


  getTable(
    id:
      string
  ): TableRow | undefined {
    return this.sql
      .exec<TableRow>(
        `
          SELECT
            id,
            table_type_id,
            status

          FROM billiard_tables

          WHERE
            id = ?

          LIMIT 1
        `,

        id
      )
      .toArray()[0]
  }


  createTable(
    input: {
      id: string
      tableTypeId: string

      name: string

      nameNormalized:
        string
    }
  ): void {
    this.sql.exec(
      `
        INSERT INTO billiard_tables (
          id,
          table_type_id,

          name,
          name_normalized,

          sort_order
        )

        SELECT
          ?,
          ?,

          ?,
          ?,

          COALESCE(
            MAX(sort_order) + 1,
            0
          )

        FROM billiard_tables
      `,

      input.id,
      input.tableTypeId,

      input.name,
      input.nameNormalized
    )
  }


  updateTableDetails(
    input: {
      id: string

      tableTypeId:
        string

      name: string

      nameNormalized:
        string
    }
  ): void {
    this.sql.exec(
      `
        UPDATE billiard_tables

        SET
          table_type_id = ?,

          name = ?,
          name_normalized = ?,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          id = ?
      `,

      input.tableTypeId,

      input.name,
      input.nameNormalized,

      input.id
    )
  }


  setTableStatus(
    id: string,
    status:
      'active' | 'disabled'
  ): void {
    this.sql.exec(
      `
        UPDATE billiard_tables

        SET
          status = ?,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE
          id = ?
      `,

      status,
      id
    )
  }


  listTableIds():
  string[] {
    return this.sql
      .exec<{
        id:
          string
      }>(`
        SELECT id

        FROM billiard_tables
      `)
      .toArray()
      .map(
        (
          row
        ) =>
          row.id
      )
  }


  reorderTables(
    ids:
      readonly string[]
  ): void {
    ids.forEach(
      (
        id,
        index
      ) => {
        this.sql.exec(
          `
            UPDATE billiard_tables

            SET
              sort_order = ?,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              id = ?
          `,

          index,
          id
        )
      }
    )
  }
}