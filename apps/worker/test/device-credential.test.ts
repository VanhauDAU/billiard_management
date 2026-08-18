import {
  describe,
  expect,
  it
} from 'vitest'

import {
  parseDeviceAuthorization
} from '../src/security/device-credential'

describe(
  'Device authorization parser',
  () => {
    const deviceId =
      '8c411241-632b-49da-bbc1-83556284c9da'

    const secret =
      'a'.repeat(64)

    it(
      'accepts the Device scheme case-insensitively',
      () => {
        expect(
          parseDeviceAuthorization(
            `device ${deviceId}.${secret}`
          )
        ).toEqual({
          deviceId,
          secret
        })
      }
    )

    it(
      'rejects a non-UUID device id',
      () => {
        expect(
          parseDeviceAuthorization(
            `Device not-a-uuid.${secret}`
          )
        ).toBeNull()
      }
    )

    it(
      'rejects a malformed device secret',
      () => {
        expect(
          parseDeviceAuthorization(
            `Device ${deviceId}.short-secret`
          )
        ).toBeNull()
      }
    )

    it(
      'rejects credentials with extra separators',
      () => {
        expect(
          parseDeviceAuthorization(
            `Device ${deviceId}.${secret}.extra`
          )
        ).toBeNull()
      }
    )
  }
)
