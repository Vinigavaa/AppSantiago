type RenderInput = {
  url: string
  userName?: string
}

type RenderedEmail = {
  subject: string
  text: string
  html: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function greet(userName?: string) {
  const trimmed = userName?.trim()
  return trimmed ? `Ola, ${escapeHtml(trimmed)}!` : "Ola!"
}

function baseLayout(input: { title: string; preheader: string; body: string }) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background:#FFFFFF;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,0.08);overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background:#05013D;color:#FFFFFF;">
                <div style="font-size:14px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">FazAí</div>
                <div style="font-size:22px;font-weight:700;margin-top:4px;">${escapeHtml(input.title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;font-size:16px;line-height:1.6;color:#0F172A;">
                ${input.body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;font-size:12px;color:#64748B;line-height:1.6;">
                Voce esta recebendo este email porque uma acao foi solicitada na sua conta do FazAí. Se nao foi voce, ignore esta mensagem.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function primaryButton(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-radius:10px;background:#05013D;">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`
}

export function renderVerificationEmail(input: RenderInput): RenderedEmail {
  const subject = "Confirme seu email no FazAí"
  const greeting = greet(input.userName)
  const body = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 20px;">Para concluir seu cadastro no FazAí, confirme que este email pertence a voce. O link e valido por <strong>1 hora</strong> e funciona apenas uma vez.</p>
    <div style="margin:24px 0;">${primaryButton("Confirmar meu email", input.url)}</div>
    <p style="margin:0 0 8px;font-size:14px;color:#475569;">Se o botao nao abrir, copie e cole este endereco no seu navegador:</p>
    <p style="margin:0 0 16px;word-break:break-all;font-size:13px;color:#05013D;">${escapeHtml(input.url)}</p>
  `

  const text = [
    input.userName?.trim() ? `Ola, ${input.userName.trim()}!` : "Ola!",
    "",
    "Para concluir seu cadastro no FazAí, confirme seu email acessando o link abaixo.",
    "O link e valido por 1 hora e funciona apenas uma vez.",
    "",
    input.url,
    "",
    "Se voce nao solicitou esse cadastro, ignore esta mensagem.",
  ].join("\n")

  const html = baseLayout({
    title: "Confirme seu email",
    preheader: "Confirme seu email para ativar sua conta no FazAí.",
    body,
  })

  return { subject, text, html }
}

type ReportNotificationInput = {
  reportId: string
  targetType: string
  targetId: string
  targetSummary: string
  authorUserId: string
  reason: string
  details: string | null
  reporterId: string
  reporterEmail: string
}

// Aviso interno para a caixa de moderacao. Nao vai para usuario: traz os ids crus
// que a ferramenta `npm run moderate` usa, para o operador agir dentro das 24h.
export function renderReportNotificationEmail(
  input: ReportNotificationInput,
): RenderedEmail {
  const subject = `[Moderacao] Denuncia ${input.reason} em ${input.targetType}`

  const rows: [string, string][] = [
    ["Denuncia", input.reportId],
    ["Motivo", input.reason],
    ["Tipo do alvo", input.targetType],
    ["Id do alvo", input.targetId],
    ["Conteudo", input.targetSummary],
    ["Autor do conteudo", input.authorUserId],
    ["Detalhe do denunciante", input.details ?? "(nao informado)"],
    ["Denunciante", `${input.reporterEmail} (${input.reporterId})`],
  ]

  const body = `
    <p style="margin:0 0 16px;">Uma nova denuncia foi registrada e precisa de analise em ate <strong>24 horas</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;line-height:1.6;">
      ${rows
        .map(
          ([label, value]) => `<tr>
        <td style="padding:6px 12px 6px 0;color:#475569;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:6px 0;color:#0F172A;word-break:break-word;">${escapeHtml(value)}</td>
      </tr>`,
        )
        .join("")}
    </table>
    <p style="margin:20px 0 0;font-size:14px;color:#475569;">Para agir: <code>npm run moderate -- show ${escapeHtml(input.reportId)}</code></p>
  `

  const text = [
    "Nova denuncia registrada. Analise em ate 24 horas.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Para agir: npm run moderate -- show ${input.reportId}`,
  ].join("\n")

  const html = baseLayout({
    title: "Nova denuncia",
    preheader: `Denuncia ${input.reason} em ${input.targetType}.`,
    body,
  })

  return { subject, text, html }
}

export function renderPasswordResetEmail(input: RenderInput): RenderedEmail {
  const subject = "Redefinicao de senha no FazAí"
  const greeting = greet(input.userName)
  const body = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 20px;">Recebemos uma solicitacao para redefinir a senha da sua conta. Confirme a solicitacao no botao abaixo e volte ao app para escolher a nova senha. O link e valido por <strong>1 hora</strong>.</p>
    <div style="margin:24px 0;">${primaryButton("Confirmar solicitacao", input.url)}</div>
    <p style="margin:0 0 8px;font-size:14px;color:#475569;">Se o botao nao abrir, copie e cole este endereco no seu navegador:</p>
    <p style="margin:0 0 16px;word-break:break-all;font-size:13px;color:#05013D;">${escapeHtml(input.url)}</p>
    <p style="margin:24px 0 0;font-size:14px;color:#475569;">Se voce nao solicitou a troca, voce pode ignorar esta mensagem com seguranca. Sua senha atual continua valida.</p>
  `

  const text = [
    input.userName?.trim() ? `Ola, ${input.userName.trim()}!` : "Ola!",
    "",
    "Recebemos uma solicitacao para redefinir sua senha do FazAí.",
    "Confirme a solicitacao no link abaixo e volte ao app para escolher a nova senha.",
    "O link e valido por 1 hora.",
    "",
    input.url,
    "",
    "Se voce nao pediu para redefinir a senha, ignore esta mensagem.",
  ].join("\n")

  const html = baseLayout({
    title: "Confirme a redefinicao de senha",
    preheader: "Confirme a solicitacao e volte ao app para escolher a nova senha.",
    body,
  })

  return { subject, text, html }
}
