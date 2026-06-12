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
              <td style="padding:28px 32px;background:#0F766E;color:#FFFFFF;">
                <div style="font-size:14px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">Santiago</div>
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
                Voce esta recebendo este email porque uma acao foi solicitada na sua conta do Santiago. Se nao foi voce, ignore esta mensagem.
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
      <td style="border-radius:10px;background:#0F766E;">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`
}

export function renderVerificationEmail(input: RenderInput): RenderedEmail {
  const subject = "Confirme seu email no Santiago"
  const greeting = greet(input.userName)
  const body = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 20px;">Para concluir seu cadastro no Santiago, confirme que este email pertence a voce. O link e valido por <strong>1 hora</strong> e funciona apenas uma vez.</p>
    <div style="margin:24px 0;">${primaryButton("Confirmar meu email", input.url)}</div>
    <p style="margin:0 0 8px;font-size:14px;color:#475569;">Se o botao nao abrir, copie e cole este endereco no seu navegador:</p>
    <p style="margin:0 0 16px;word-break:break-all;font-size:13px;color:#0F766E;">${escapeHtml(input.url)}</p>
  `

  const text = [
    input.userName?.trim() ? `Ola, ${input.userName.trim()}!` : "Ola!",
    "",
    "Para concluir seu cadastro no Santiago, confirme seu email acessando o link abaixo.",
    "O link e valido por 1 hora e funciona apenas uma vez.",
    "",
    input.url,
    "",
    "Se voce nao solicitou esse cadastro, ignore esta mensagem.",
  ].join("\n")

  const html = baseLayout({
    title: "Confirme seu email",
    preheader: "Confirme seu email para ativar sua conta no Santiago.",
    body,
  })

  return { subject, text, html }
}

export function renderPasswordResetEmail(input: RenderInput): RenderedEmail {
  const subject = "Redefinicao de senha no Santiago"
  const greeting = greet(input.userName)
  const body = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 20px;">Recebemos uma solicitacao para redefinir a senha da sua conta. O link e valido por <strong>1 hora</strong> e expira apos o primeiro uso.</p>
    <div style="margin:24px 0;">${primaryButton("Redefinir minha senha", input.url)}</div>
    <p style="margin:0 0 8px;font-size:14px;color:#475569;">Se o botao nao abrir, copie e cole este endereco no seu navegador ou diretamente no app:</p>
    <p style="margin:0 0 16px;word-break:break-all;font-size:13px;color:#0F766E;">${escapeHtml(input.url)}</p>
    <p style="margin:24px 0 0;font-size:14px;color:#475569;">Se voce nao solicitou a troca, voce pode ignorar esta mensagem com seguranca. Sua senha atual continua valida.</p>
  `

  const text = [
    input.userName?.trim() ? `Ola, ${input.userName.trim()}!` : "Ola!",
    "",
    "Recebemos uma solicitacao para redefinir sua senha do Santiago.",
    "O link e valido por 1 hora e expira apos o primeiro uso.",
    "",
    input.url,
    "",
    "Se voce nao pediu para redefinir a senha, ignore esta mensagem.",
  ].join("\n")

  const html = baseLayout({
    title: "Redefina sua senha",
    preheader: "Use o link para escolher uma nova senha.",
    body,
  })

  return { subject, text, html }
}
