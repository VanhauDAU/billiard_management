import type {
  IpcMainInvokeEvent
} from 'electron'

import {
  isTrustedRendererUrl
} from './trusted-url'

export function assertTrustedIpcSender(
  event: IpcMainInvokeEvent
): void {
  const frame = event.senderFrame

  if (
    !frame ||
    frame.parent !== null ||
    !isTrustedRendererUrl(frame.url)
  ) {
    throw new Error(
      'Forbidden IPC sender'
    )
  }
}
