import { z } from 'zod'

export const ApiHealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string()
})

export type ApiHealthResponse =
  z.infer<typeof ApiHealthResponseSchema>