import { z } from 'zod'
import {
  DevicePlatformSchema,
  DeviceTypeSchema
} from './device-context'

export const DeviceSecretSchema = z.string()
  .regex(/^[a-f0-9]{64}$/i)

export const ActivateDeviceRequestSchema = z.object({
  activationToken: z.string()
    .min(32)
    .max(128),

  installationId: z.string()
    .uuid(),

  name: z.string()
    .trim()
    .min(1)
    .max(100),

  deviceType: DeviceTypeSchema,

  platform: DevicePlatformSchema,

  appVersion: z.string()
    .trim()
    .min(1)
    .max(50)
    .nullable()
    .optional()
})

export type ActivateDeviceRequest =
  z.infer<typeof ActivateDeviceRequestSchema>

export const ActivateDeviceResponseSchema = z.object({
  deviceId: z.string().uuid(),

  deviceSecret: DeviceSecretSchema,

  storeId: z.string().min(1),

  deviceType: DeviceTypeSchema,

  platform: DevicePlatformSchema
})

export type ActivateDeviceResponse =
  z.infer<typeof ActivateDeviceResponseSchema>
