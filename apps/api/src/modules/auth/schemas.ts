import { z } from "zod"

export const publicAuthRoleSchema = z.enum(["CLIENT", "PROFESSIONAL"])

export const publicSignUpSchema = z
  .object({
    callbackURL: z.string().optional(),
    displayUsername: z.string().optional(),
    email: z.email(),
    image: z.string().optional(),
    name: z.string().min(1),
    password: z.string().min(8).max(128),
    role: publicAuthRoleSchema.default("CLIENT"),
    username: z.string().min(3).max(30).optional(),
  })
  .strict()

export type PublicAuthRole = z.infer<typeof publicAuthRoleSchema>
