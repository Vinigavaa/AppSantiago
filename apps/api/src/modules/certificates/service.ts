import { randomBytes } from "node:crypto"

import { prisma } from "@santiago/database"

import { getEntitlementByProfessionalId } from "@/modules/subscriptions/entitlement"

// Certificado de participacao: selo de participacao/verificacao na plataforma —
// NAO uma certificacao tecnica/profissional oficial. A validade nunca e gravada:
// e sempre derivada do status atual da assinatura, para nao dessincronizar.

// Aviso de escopo exibido no app e na verificacao publica. Centralizado aqui para
// ter um texto unico e consistente.
export const CERTIFICATE_DISCLAIMER =
  "Selo de participacao e verificacao na plataforma Maos a Obra. Nao e uma " +
  "certificacao tecnica ou profissional oficial."

// Codigo aleatorio, nao sequencial e legivel. A unicidade tambem e garantida pelo
// indice unico; em colisao (improvavel) o upsert falha e uma nova tentativa gera outro.
function generateCode(): string {
  return `MAO-${randomBytes(6).toString("hex").toUpperCase()}`
}

// Emite o certificado do profissional se ainda nao existir. Idempotente: uma
// reativacao/renovacao reaproveita o certificado existente (nao duplica). Deve ser
// chamada no ponto em que a assinatura passa a ativa.
export async function emitCertificateIfNeeded(
  professionalId: string,
  holderName: string,
): Promise<void> {
  const existing = await prisma.participationCertificate.findUnique({
    where: { professionalId },
    select: { id: true },
  })

  if (existing) {
    return
  }

  await prisma.participationCertificate.create({
    data: {
      professionalId,
      code: generateCode(),
      holderNameSnapshot: holderName,
    },
  })
}

export type OwnCertificate = {
  code: string
  issuedAt: Date
  holderName: string
  disclaimer: string
}

// Certificado do próprio profissional (para exibir no app). Retorna null se ainda
// não emitido. A validade é derivada do status da assinatura pelo chamador.
export async function getOwnCertificate(userId: string): Promise<OwnCertificate | null> {
  const certificate = await prisma.participationCertificate.findFirst({
    where: { professional: { userId } },
    select: { code: true, issuedAt: true, holderNameSnapshot: true },
  })

  if (!certificate) {
    return null
  }

  return {
    code: certificate.code,
    issuedAt: certificate.issuedAt,
    holderName: certificate.holderNameSnapshot,
    disclaimer: CERTIFICATE_DISCLAIMER,
  }
}

export type CertificateVerification =
  | { found: false }
  | {
      found: true
      valid: boolean
      holderName: string
      issuedAt: Date
      disclaimer: string
    }

// Verificacao publica por codigo (sem autenticacao). Retorna se e valido AGORA,
// derivando a validade do status da assinatura. Nao expoe dados de contato.
export async function verifyCertificate(code: string): Promise<CertificateVerification> {
  const certificate = await prisma.participationCertificate.findUnique({
    where: { code },
    select: { professionalId: true, holderNameSnapshot: true, issuedAt: true },
  })

  if (!certificate) {
    return { found: false }
  }

  const entitlement = await getEntitlementByProfessionalId(certificate.professionalId)

  return {
    found: true,
    valid: entitlement.isActive,
    holderName: certificate.holderNameSnapshot,
    issuedAt: certificate.issuedAt,
    disclaimer: CERTIFICATE_DISCLAIMER,
  }
}
