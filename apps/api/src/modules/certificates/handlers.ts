import type { Context } from "hono"

import { verifyCertificate } from "./service"

// GET /certificates/:code — verificacao publica (sem autenticacao). Qualquer pessoa
// confere um codigo e ve se e valido AGORA. Nao expoe dados de contato. Deixa
// explicito que e um selo de participacao, nao credencial oficial.
export async function verifyCertificateHandler(context: Context) {
  const code = context.req.param("code")?.trim()

  if (!code) {
    return context.json({ code: "INVALID_CODE", message: "Codigo invalido." }, 400)
  }

  const result = await verifyCertificate(code)

  if (!result.found) {
    return context.json(
      { code: "NOT_FOUND", message: "Certificado nao encontrado." },
      404,
    )
  }

  return context.json({
    valid: result.valid,
    holderName: result.holderName,
    issuedAt: result.issuedAt.toISOString(),
    disclaimer: result.disclaimer,
  })
}
