import { z } from 'zod'

export const AuthContextSchema = z.object({
  sessionId: z.string().uuid(),
  storeId: z.string().min(1),
  deviceId: z.string().min(1),
  actorId: z.string().min(1),
  membershipId: z.string().min(1),
  roleId: z.string().min(1),
  pinCredentialVersion: z.number().int().min(1).nullable().optional()
})

export type AuthContext = z.infer<typeof AuthContextSchema>