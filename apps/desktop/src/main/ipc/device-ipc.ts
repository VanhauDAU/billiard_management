import {
  ipcMain
} from 'electron'

import {
  IPC_CHANNELS
} from '../../shared/ipc-channels'

import type {
  ActivateDesktopDeviceInput
} from '../../shared/device-api'

import {
  activateDesktopDevice,
  getDesktopDeviceState
} from '../device/device-service'

import {
  isTrustedRendererUrl
} from '../security/trusted-url'

function assertTrustedSender(
  senderUrl: string
): void {
  if (
    !isTrustedRendererUrl(
      senderUrl
    )
  ) {
    throw new Error(
      'Forbidden IPC sender'
    )
  }
}

function parseActivationInput(
  value: unknown
): ActivateDesktopDeviceInput {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    throw new Error(
      'invalid_activation_input'
    )
  }

  const candidate =
    value as Partial<
      ActivateDesktopDeviceInput
    >

  if (
    typeof candidate.activationToken !==
      'string' ||

    typeof candidate.name !==
      'string'
  ) {
    throw new Error(
      'invalid_activation_input'
    )
  }

  return {
    activationToken:
      candidate.activationToken,

    name:
      candidate.name
  }
}

export function registerDeviceIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.deviceGetState,

    async (event) => {
      const senderUrl =
        event.senderFrame?.url ??
        event.sender.getURL()

      assertTrustedSender(
        senderUrl
      )

      return getDesktopDeviceState()
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.deviceActivate,

    async (
      event,
      rawInput: unknown
    ) => {
      const senderUrl =
        event.senderFrame?.url ??
        event.sender.getURL()

      assertTrustedSender(
        senderUrl
      )

      const input =
        parseActivationInput(
          rawInput
        )

      return activateDesktopDevice(
        input
      )
    }
  )
}