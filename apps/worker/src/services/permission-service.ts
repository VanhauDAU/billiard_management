import {
  PermissionKeySchema
} from '@billiards/contracts'

import type {
  AuthContext,
  PermissionKey
} from '@billiards/contracts'

import type {
  PermissionContext
} from '../types/permission-context'


type PermissionRow = {
  membership_status:
    'pending'
    | 'active'
    | 'suspended'
    | 'revoked'

  role_status:
    'active'
    | 'disabled'

  permission_key:
    string | null
}


export type ResolvePermissionContextResult =
  | {
      ok: true

      context:
        PermissionContext
    }
  | {
      ok: false

      error:
        | 'actor_inactive'
        | 'permission_context_unavailable'
    }


export async function resolvePermissionContext(
  db: D1Database,
  authContext: AuthContext
): Promise<ResolvePermissionContextResult> {
  try {
    const result =
      await db
        .prepare(`
          SELECT
            m.status
              AS membership_status,

            r.status
              AS role_status,

            rp.permission_key

          FROM store_memberships m

          INNER JOIN roles r
            ON r.store_id =
              m.store_id

            AND r.id =
              m.role_id

          LEFT JOIN role_permissions rp
            ON rp.store_id =
              m.store_id

            AND rp.role_id =
              r.id

          WHERE
            m.store_id = ?1

            AND m.id = ?2

            AND m.user_id = ?3

            AND r.id = ?4

          ORDER BY
            rp.permission_key
        `)
        .bind(
          authContext.storeId,
          authContext.membershipId,
          authContext.actorId,
          authContext.roleId
        )
        .all<PermissionRow>()


    if (!result.success) {
      return {
        ok: false,

        error:
          'permission_context_unavailable'
      }
    }


    const rows =
      result.results


    /*
     * Even a role with zero permissions
     * returns one LEFT JOIN row with
     * permission_key = NULL.
     *
     * Zero rows therefore means the
     * membership/role relationship no
     * longer matches the trusted
     * AuthContext.
     */
    if (rows.length === 0) {
      return {
        ok: false,
        error:
          'actor_inactive'
      }
    }


    const first =
      rows[0]


    if (
      first.membership_status !==
        'active' ||

      first.role_status !==
        'active'
    ) {
      return {
        ok: false,
        error:
          'actor_inactive'
      }
    }


    const permissions =
      new Set<PermissionKey>()


    for (const row of rows) {
      if (
        row.permission_key ===
          null
      ) {
        continue
      }


      const parsed =
        PermissionKeySchema
          .safeParse(
            row.permission_key
          )


      /*
       * permission_catalog is
       * system-controlled.
       *
       * An unknown DB permission means
       * code/schema drift. Fail closed
       * instead of accepting arbitrary
       * capabilities.
       */
      if (!parsed.success) {
        console.error(
          'Unknown permission key in D1:',
          row.permission_key
        )

        return {
          ok: false,

          error:
            'permission_context_unavailable'
        }
      }


      permissions.add(
        parsed.data
      )
    }


    return {
      ok: true,

      context: {
        authContext,

        permissions
      }
    }
  } catch (error) {
    console.error(
      'Permission context resolution failed:',
      error
    )

    return {
      ok: false,

      error:
        'permission_context_unavailable'
    }
  }
}