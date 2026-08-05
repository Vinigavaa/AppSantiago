import { serve } from "@hono/node-server"

import { env } from "@/config/env"
import { app, injectWebSocket } from "@/http/app"

const server = serve(
  {
    fetch: app.fetch,
    port: env.API_PORT,
  },
  (info) => {
    console.log(`API running on http://localhost:${info.port}`)
  },
)

// Liga o upgrade de WebSocket (`GET /ws`) ao mesmo servidor HTTP: um processo,
// uma porta, um deploy.
injectWebSocket(server)
