import type {
  StoreSchemaMigration
} from './types'


export const migration002TableFoundation:
StoreSchemaMigration = {
  version: 2,

  name:
    'table-foundation',

  up(storage) {
    storage.sql.exec(`
      -- ===================================================
      -- TABLE TYPES
      --
      -- Configurable billiards table categories.
      --
      -- No Store ID is persisted here because the
      -- Durable Object SQLite database itself is already
      -- scoped to exactly one Store.
      -- ===================================================

      CREATE TABLE table_types (
        id TEXT PRIMARY KEY
          CHECK (
            length(id) > 0
          ),

        name TEXT NOT NULL
          CHECK (
            length(name) > 0
          ),

        name_normalized TEXT NOT NULL
          CHECK (
            length(name_normalized) > 0
          ),

        color_hex TEXT NOT NULL
          CHECK (
            length(color_hex) = 7

            AND substr(
              color_hex,
              1,
              1
            ) = '#'

            AND substr(
              color_hex,
              2
            ) NOT GLOB
              '*[^0-9A-F]*'
          ),

        status TEXT NOT NULL
          DEFAULT 'active'
          CHECK (
            status IN (
              'active',
              'disabled'
            )
          ),

        sort_order INTEGER NOT NULL
          DEFAULT 0
          CHECK (
            sort_order >= 0
          ),

        created_at TEXT NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        UNIQUE (
          name_normalized
        )
      ) STRICT;


      CREATE INDEX
        idx_table_types_status_sort

      ON table_types (
        status,
        sort_order,
        name_normalized
      );


      -- ===================================================
      -- BILLIARD TABLES
      --
      -- Master/configuration state only.
      --
      -- active/disabled belong here.
      -- available/playing will later be derived from
      -- TableSession state instead of being persisted here.
      -- ===================================================

      CREATE TABLE billiard_tables (
        id TEXT PRIMARY KEY
          CHECK (
            length(id) > 0
          ),

        table_type_id TEXT NOT NULL,

        name TEXT NOT NULL
          CHECK (
            length(name) > 0
          ),

        name_normalized TEXT NOT NULL
          CHECK (
            length(name_normalized) > 0
          ),

        status TEXT NOT NULL
          DEFAULT 'active'
          CHECK (
            status IN (
              'active',
              'disabled'
            )
          ),

        sort_order INTEGER NOT NULL
          DEFAULT 0
          CHECK (
            sort_order >= 0
          ),

        created_at TEXT NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        UNIQUE (
          name_normalized
        ),

        FOREIGN KEY (
          table_type_id
        )
          REFERENCES table_types(id)
          ON DELETE RESTRICT
      ) STRICT;


      CREATE INDEX
        idx_billiard_tables_status_sort

      ON billiard_tables (
        status,
        sort_order,
        name_normalized
      );


      CREATE INDEX
        idx_billiard_tables_type_status_sort

      ON billiard_tables (
        table_type_id,
        status,
        sort_order
      );


      -- ===================================================
      -- PROCESSED COMMANDS
      --
      -- Infrastructure for idempotent Store mutations.
      --
      -- Actual command execution/replay behavior is added
      -- in a later M1.4 gate.
      -- ===================================================

      CREATE TABLE processed_commands (
        command_id TEXT PRIMARY KEY
          CHECK (
            length(command_id) > 0
          ),

        command_type TEXT NOT NULL
          CHECK (
            length(command_type) > 0
          ),

        request_fingerprint TEXT NOT NULL
          CHECK (
            length(
              request_fingerprint
            ) = 64

            AND request_fingerprint
              NOT GLOB
                '*[^0-9a-f]*'
          ),

        actor_id TEXT NOT NULL
          CHECK (
            length(actor_id) > 0
          ),

        device_id TEXT NOT NULL
          CHECK (
            length(device_id) > 0
          ),

        client_issued_at TEXT NOT NULL,

        processed_at TEXT NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        outcome_kind TEXT NOT NULL
          CHECK (
            outcome_kind IN (
              'success',
              'rejected'
            )
          ),

        result_json TEXT NOT NULL
          CHECK (
            json_valid(
              result_json
            )
          )
      ) STRICT;


      CREATE INDEX
        idx_processed_commands_processed_at

      ON processed_commands (
        processed_at
      );
    `)
  }
}