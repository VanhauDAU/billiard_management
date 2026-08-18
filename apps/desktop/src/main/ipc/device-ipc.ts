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
  assertTrustedIpcSender
} from '../security/ipc-sender'

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
      assertTrustedIpcSender(event)

      return getDesktopDeviceState()
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.deviceActivate,

    async (
      event,
      rawInput: unknown
    ) => {
      assertTrustedIpcSender(event)

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
