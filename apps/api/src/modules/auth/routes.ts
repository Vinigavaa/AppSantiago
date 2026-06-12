import { Hono } from "hono"

import { auth } from "./auth"

export const authRoutes = new Hono()

authRoutes.on(["GET", "POST"], "/*", (context) => {
  return auth.handler(context.req.raw)
})
