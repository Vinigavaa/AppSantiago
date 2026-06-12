import { serve } from "@hono/node-server"

import { env } from "@/config/env"
import { app } from "@/http/app"

serve(
  {
    fetch: app.fetch,
    port: env.API_PORT,
  },
  (info) => {
    console.log(`API running on http://localhost:${info.port}`)
  },
)
