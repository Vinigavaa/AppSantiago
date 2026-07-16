import { Hono } from "hono"

import { env } from "@/config/env"
import {
  resetPasswordLandingPath,
  verifyEmailCallbackPath,
} from "@/modules/auth/auth-urls"

const deepLinkScheme = env.APP_DEEP_LINK_SCHEME

const errorMessages: Record<string, string> = {
  INVALID_TOKEN: "O link de verificacao expirou ou ja foi usado.",
  EXPIRED_TOKEN: "O link de verificacao expirou.",
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

type PageInput = {
  title: string
  heading: string
  message: string
  primary?: { label: string; url: string }
  secondary?: { label: string; url: string }
  variant?: "success" | "error" | "info"
}

function renderPage(input: PageInput) {
  const accent =
    input.variant === "error"
      ? "#B91C1C"
      : input.variant === "info"
        ? "#05013D"
        : "#15803D"
  const subtleAccent =
    input.variant === "error"
      ? "#FEE2E2"
      : input.variant === "info"
        ? "#EAEAF3"
        : "#DCFCE7"

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background:#F1F5F9; color:#0F172A; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
      .card { background:#FFFFFF; max-width:480px; width:100%; padding:32px; border-radius:16px; box-shadow:0 10px 30px rgba(15,23,42,0.08); }
      .badge { display:inline-block; padding:6px 12px; border-radius:999px; background:${subtleAccent}; color:${accent}; font-weight:700; font-size:12px; letter-spacing:1px; text-transform:uppercase; }
      h1 { margin:16px 0 8px; font-size:24px; }
      p { color:#475569; line-height:1.6; margin:0 0 16px; }
      .actions { margin-top:24px; display:flex; flex-direction:column; gap:12px; }
      a.button { display:inline-block; text-align:center; padding:14px 18px; border-radius:10px; text-decoration:none; font-weight:600; }
      a.primary { background:#05013D; color:#FFFFFF; }
      a.secondary { background:#F1F5F9; color:#0F172A; }
      .token { background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:10px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; word-break:break-all; font-size:13px; color:#0F172A; }
      footer { text-align:center; color:#94A3B8; margin-top:24px; font-size:12px; }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="badge">Mãos à Obra</span>
      <h1>${escapeHtml(input.heading)}</h1>
      <p>${input.message}</p>
      <div class="actions">
        ${input.primary ? `<a class="button primary" href="${escapeHtml(input.primary.url)}">${escapeHtml(input.primary.label)}</a>` : ""}
        ${input.secondary ? `<a class="button secondary" href="${escapeHtml(input.secondary.url)}">${escapeHtml(input.secondary.label)}</a>` : ""}
      </div>
      <footer>Mãos à Obra</footer>
    </main>
  </body>
</html>`
}

export const landingPages = new Hono()

landingPages.get(verifyEmailCallbackPath, (context) => {
  const error = context.req.query("error")

  if (error) {
    const message = errorMessages[error] ?? "Nao foi possivel confirmar seu email."
    return context.html(
      renderPage({
        title: "Falha na verificacao",
        heading: "Nao foi possivel confirmar seu email",
        message,
        primary: { label: "Abrir o app Mãos à Obra", url: `${deepLinkScheme}://login` },
        variant: "error",
      }),
      400,
    )
  }

  return context.html(
    renderPage({
      title: "Email confirmado",
      heading: "Email confirmado com sucesso!",
      message: "Sua conta esta ativa. Voce ja pode fazer login no app Mãos à Obra.",
      primary: { label: "Abrir o app Mãos à Obra", url: `${deepLinkScheme}://login` },
      variant: "success",
    }),
  )
})

landingPages.get(resetPasswordLandingPath, (context) => {
  const token = context.req.query("token")?.trim()

  if (!token) {
    return context.html(
      renderPage({
        title: "Link invalido",
        heading: "Link de redefinicao invalido",
        message: "O link nao contem um token. Solicite um novo email de redefinicao.",
        variant: "error",
      }),
      400,
    )
  }

  const deepLink = `${deepLinkScheme}://reset-password?token=${encodeURIComponent(token)}`

  return context.html(
    renderPage({
      title: "Redefinir senha",
      heading: "Redefinir sua senha",
      message: `Toque no botao abaixo para abrir o app Mãos à Obra com o token preenchido. Se voce estiver em um computador, copie o token abaixo e cole na tela <strong>Nova senha</strong> do app.<div class="token" style="margin-top:16px;">${escapeHtml(token)}</div>`,
      primary: { label: "Abrir no app Mãos à Obra", url: deepLink },
      variant: "info",
    }),
  )
})
