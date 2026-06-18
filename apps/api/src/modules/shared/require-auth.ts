import type { Context, MiddlewareHandler, Next } from "hono"

import { auth } from "@/modules/auth/auth"

// Dados do usuário autenticado disponibilizados às rotas protegidas.
export type AuthenticatedUser = {
  id: string
  email: string
  name: string
  role: string
}

type AuthVariables = {
  user: AuthenticatedUser
}

export type AuthedContext = Context<{ Variables: AuthVariables }>

// Middleware que exige uma sessão válida do better-auth. A sessão chega pelo
// cookie enviado no header (no mobile via authClient.getCookie()).
export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (
  context: Context,
  next: Next,
) => {
  if (context.req.method === "OPTIONS") {
    await next()
    return
  }

  const session = await auth.api
    .getSession({ headers: context.req.raw.headers })
    .catch(() => null)

  if (!session?.user) {
    return context.json(
      { code: "UNAUTHORIZED", message: "Sessão inválida. Entre novamente." },
      401,
    )
  }

  context.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as { role?: string }).role ?? "CLIENT",
  })

  await next()
}
