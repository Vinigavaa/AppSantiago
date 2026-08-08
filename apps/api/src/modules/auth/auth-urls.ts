import { env } from "@/config/env"

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

const apiBaseUrl = trimTrailingSlash(env.BETTER_AUTH_URL)
const deepLinkScheme = env.APP_DEEP_LINK_SCHEME

export const verifyEmailCallbackPath = "/auth/email-verified"
export const passwordResetConfirmPath = "/auth/password-reset-confirm"

export function getEmailVerificationCallbackUrl() {
  return `${apiBaseUrl}${verifyEmailCallbackPath}`
}

export function getEmailVerificationUrl(token: string) {
  const callbackURL = encodeURIComponent(getEmailVerificationCallbackUrl())
  return `${apiBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${callbackURL}`
}

// O link do email apenas confirma a solicitacao. O token de redefinicao nunca
// sai do servidor por email: ele e entregue ao app pela consulta de status.
export function getPasswordResetConfirmUrl(confirmationToken: string) {
  return `${apiBaseUrl}${passwordResetConfirmPath}?token=${encodeURIComponent(confirmationToken)}`
}

export function getTrustedRedirectOrigins() {
  return [
    apiBaseUrl,
    `${deepLinkScheme}://`,
    `${deepLinkScheme}://*`,
    ...(env.APP_WEB_URL ? [trimTrailingSlash(env.APP_WEB_URL)] : []),
  ]
}
