import type { StoreSchemaMigration } from './types'

export const migration001Foundation: StoreSchemaMigration = {
  version: 1,
  name: 'foundation',

  up() {
    // Schema version 1 represents the current Store DO foundation.
    //
    // system_metadata is bootstrapped by the migration runner
    // before migrations execute.
    //
    // No operational billiards tables are created in V1 yet.
  }
}