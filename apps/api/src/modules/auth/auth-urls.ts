import { env } from "@/config/env"

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

const apiBaseUrl = trimTrailingSlash(env.BETTER_AUTH_URL)
const deepLinkScheme = env.APP_DEEP_LINK_SCHEME

export const verifyEmailCallbackPath = "/auth/email-verified"
export const resetPasswordLandingPath = "/auth/reset-password"

export function getEmailVerificationCallbackUrl() {
  return `${apiBaseUrl}${verifyEmailCallbackPath}`
}

export function getEmailVerificationUrl(token: string) {
  const callbackURL = encodeURIComponent(getEmailVerificationCallbackUrl())
  return `${apiBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${callbackURL}`
}

export function getPasswordResetUrl(token: string) {
  return `${deepLinkScheme}://reset-password?token=${encodeURIComponent(token)}`
}

export function getPasswordResetWebFallbackUrl(token: string) {
  return `${apiBaseUrl}${resetPasswordLandingPath}?token=${encodeURIComponent(token)}`
}

export function getTrustedRedirectOrigins() {
  return [
    apiBaseUrl,
    `${deepLinkScheme}://`,
    `${deepLinkScheme}://*`,
    ...(env.APP_WEB_URL ? [trimTrailingSlash(env.APP_WEB_URL)] : []),
  ]
}
