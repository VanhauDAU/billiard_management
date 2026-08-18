import { z } from 'zod'

/**
 * Command shape accepted from an untrusted client.
 *
 * Store, device and actor identity are intentionally absent.
 * They must be resolved from authenticated server-side context.
 */
export const CommandEnvelopeSchema = z.object({
  commandId: z.string().uuid(),
  issuedAt: z.string().datetime(),
  commandType: z.string()
    .trim()
    .min(1)
    .max(100),
  payload: z.unknown()
}).strict()

export type CommandEnvelope =
  z.infer<typeof CommandEnvelopeSchema>

/**
 * Internal envelope after Device/Auth context has been resolved.
 * Never accept this shape directly as client authority.
 */
export const TrustedCommandEnvelopeSchema =
  CommandEnvelopeSchema.extend({
    storeId: z.string().min(1),
    deviceId: z.string().uuid(),
    actorId: z.string().min(1)
  })

export type TrustedCommandEnvelope =
  z.infer<typeof TrustedCommandEnvelopeSchema>
