import { z } from 'zod'

export const CommandEnvelopeSchema = z.object({
  commandId: z.string().min(1),
  storeId: z.string().min(1),
  deviceId: z.string().min(1),
  actorId: z.string().min(1),
  issuedAt: z.string().datetime(),
  commandType: z.string().min(1),
  payload: z.unknown()
})

export type CommandEnvelope =
  z.infer<typeof CommandEnvelopeSchema>