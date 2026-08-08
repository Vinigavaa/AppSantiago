import { env } from "@/config/env"

import {
  renderPasswordResetEmail,
  renderReportNotificationEmail,
  renderVerificationEmail,
} from "./email-templates"

type SendEmailInput = {
  to: string
  subject: string
  text: string
  html: string
}

const RESEND_ENDPOINT = "https://api.resend.com/emails"

type ResendErrorBody = {
  name?: string
  message?: string
  statusCode?: number
}

async function sendViaResend(input: SendEmailInput) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
    }),
  })

  if (response.ok) {
    const body = (await response.json().catch(() => null)) as { id?: string } | null
    console.info(
      JSON.stringify({
        type: "email_sent",
        provider: "resend",
        to: input.to,
        subject: input.subject,
        resendId: body?.id ?? null,
      }),
    )
    return
  }

  const errorBody = (await response.json().catch(() => null)) as ResendErrorBody | null

  throw new Error(
    `Resend rejected the email (${response.status}): ${
      errorBody?.message ?? errorBody?.name ?? response.statusText
    }`,
  )
}

export async function sendEmail(input: SendEmailInput) {
  if (env.EMAIL_PROVIDER === "console") {
    console.info(
      JSON.stringify({
        type: "email",
        provider: "console",
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    )
    return
  }

  try {
    await sendViaResend(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    console.error(
      JSON.stringify({
        type: "email_failure",
        provider: "resend",
        to: input.to,
        subject: input.subject,
        error: message,
      }),
    )
    throw error
  }
}

export async function sendVerificationEmail(input: {
  to: string
  url: string
  userName?: string
}) {
  const rendered = renderVerificationEmail({ url: input.url, userName: input.userName })

  await sendEmail({
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  })
}

// Aviso de denuncia para a caixa de moderacao. Quem chama trata a falha: a
// denuncia ja esta gravada e nao pode ser perdida porque o email nao saiu.
export async function sendReportNotificationEmail(input: {
  reportId: string
  targetType: string
  targetId: string
  targetSummary: string
  authorUserId: string
  reason: string
  details: string | null
  reporterId: string
  reporterEmail: string
}) {
  const rendered = renderReportNotificationEmail(input)

  await sendEmail({
    to: env.MODERATION_EMAIL,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  })
}

export async function sendPasswordResetEmail(input: {
  to: string
  url: string
  userName?: string
}) {
  const rendered = renderPasswordResetEmail({ url: input.url, userName: input.userName })

  await sendEmail({
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  })
}
