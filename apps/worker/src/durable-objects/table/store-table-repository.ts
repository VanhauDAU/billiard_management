import {
  BilliardTableViewSchema,
  TableConfigurationResponseSchema,
  TableTypeViewSchema
} from '@billiards/contracts'

import type {
  TableConfigurationResponse
} from '@billiards/contracts'


type TableTypeRow = {
  id:
    string

  name:
    string

  color_hex:
    string

  status:
    string

  sort_order:
    number
}


type BilliardTableRow = {
  id:
    string

  table_type_id:
    string

  name:
    string

  status:
    string

  sort_order:
    number
}


export class StoreTableRepository {
  constructor(
    private readonly sql:
      SqlStorage
  ) {}


  getConfiguration():
  TableConfigurationResponse {
    const tableTypes =
      this.sql
        .exec<TableTypeRow>(`
          SELECT
            id,
            name,
            color_hex,
            status,
            sort_order

          FROM table_types

          ORDER BY
            sort_order,
            name_normalized,
            id
        `)
        .toArray()
        .map(
          (
            row
          ) =>
            TableTypeViewSchema.parse({
              id:
                row.id,

              name:
                row.name,

              colorHex:
                row.color_hex,

              status:
                row.status,

              sortOrder:
                row.sort_order
            })
        )


    const tables =
      this.sql
        .exec<BilliardTableRow>(`
          SELECT
            id,
            table_type_id,
            name,
            status,
            sort_order

          FROM billiard_tables

          ORDER BY
            sort_order,
            name_normalized,
            id
        `)
        .toArray()
        .map(
          (
            row
          ) =>
            BilliardTableViewSchema.parse({
              id:
                row.id,

              tableTypeId:
                row.table_type_id,

              name:
                row.name,

              status:
                row.status,

              sortOrder:
                row.sort_order
            })
        )


    return (
      TableConfigurationResponseSchema
        .parse({
          tableTypes,
          tables
        })
    )
  }
}