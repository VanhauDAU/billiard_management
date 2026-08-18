import { z } from 'zod'

export const DeviceTypeSchema = z.enum([
  'desktop_pos',
  'mobile_pwa'
])

export type DeviceType =
  z.infer<typeof DeviceTypeSchema>

export const DevicePlatformSchema = z.enum([
  'windows',
  'macos',
  'ios',
  'android',
  'web'
])

export type DevicePlatform =
  z.infer<typeof DevicePlatformSchema>

export const DeviceContextSchema = z.object({
  device: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    installationId: z.string().uuid(),
    type: DeviceTypeSchema,
    platform: DevicePlatformSchema,
    appVersion: z.string().nullable()
  }),

  store: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    timezone: z.string().min(1),
    locale: z.string().min(1),
    currency: z.string().min(1)
  })
})

export type DeviceContext =
  z.infer<typeof DeviceContextSchema>
