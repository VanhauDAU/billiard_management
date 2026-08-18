import type {
  TableManagementCommand
} from '@billiards/contracts'


function compareKeys(
  left: string,
  right: string
): number {
  if (
    left < right
  ) {
    return -1
  }

  if (
    left > right
  ) {
    return 1
  }

  return 0
}


function canonicalize(
  value: unknown
): unknown {
  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      canonicalize
    )
  }


  if (
    typeof value === 'object' &&
    value !== null
  ) {
    const source =
      value as Record<
        string,
        unknown
      >


    return Object.fromEntries(
      Object.keys(
        source
      )
        .sort(
          compareKeys
        )

        .map(
          (
            key
          ) => [
            key,
            canonicalize(
              source[key]
            )
          ]
        )
    )
  }


  return value
}


export async function createTableCommandFingerprint(
  command:
    TableManagementCommand
): Promise<string> {
  /*
   * commandId is intentionally excluded.
   *
   * It identifies the delivery/retry slot,
   * not the business intent itself.
   *
   * issuedAt IS included. Reusing the same
   * commandId with another claimed intent
   * timestamp is considered a different
   * command and must conflict.
   */
  const canonical =
    JSON.stringify(
      canonicalize({
        commandType:
          command.commandType,

        issuedAt:
          command.issuedAt,

        payload:
          command.payload
      })
    )


  const bytes =
    new TextEncoder()
      .encode(
        canonical
      )


  const digest =
    await crypto.subtle
      .digest(
        'SHA-256',
        bytes
      )


  return Array.from(
    new Uint8Array(
      digest
    )
  )
    .map(
      (
        value
      ) =>
        value
          .toString(16)
          .padStart(
            2,
            '0'
          )
    )
    .join('')
}