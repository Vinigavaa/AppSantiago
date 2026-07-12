import { prisma } from "@santiago/database"
import { z } from "zod"

import { cloudinaryConfig } from "@/config/env"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { cloudinary, isCloudinaryEnabled } from "./cloudinary"

// Pasta fixa dos avatares. O public_id inclui o id do usuario, então cada um só
// pode escrever o proprio avatar e um novo upload sobrescreve o anterior.
const AVATAR_FOLDER = "santiago/avatars"

function avatarPublicId(userId: string): string {
  return `${AVATAR_FOLDER}/${userId}`
}

function uploadsDisabled(context: AuthedContext) {
  return context.json(
    { code: "UPLOADS_DISABLED", message: "O envio de imagens está indisponível no momento." },
    503,
  )
}

// Gera uma assinatura de upload para a Cloudinary. O app usa esta assinatura para
// enviar a imagem direto ao CDN (os bytes não passam pela API). O secret nunca sai
// do servidor: apenas a assinatura derivada dele é enviada ao cliente.
export async function avatarSignatureHandler(context: AuthedContext) {
  if (!isCloudinaryEnabled || !cloudinaryConfig) {
    return uploadsDisabled(context)
  }

  const user = context.get("user")
  const timestamp = Math.round(Date.now() / 1000)
  const publicId = avatarPublicId(user.id)

  // Parametros que o app enviara no upload. A assinatura cobre exatamente estes
  // valores; qualquer divergencia é recusada pela Cloudinary.
  const paramsToSign = {
    public_id: publicId,
    timestamp,
    overwrite: true,
    invalidate: true,
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, cloudinaryConfig.apiSecret)

  return context.json({
    cloudName: cloudinaryConfig.cloudName,
    apiKey: cloudinaryConfig.apiKey,
    timestamp,
    signature,
    publicId,
    overwrite: true,
    invalidate: true,
  })
}

const confirmSchema = z.object({
  version: z.coerce.number().int().positive(),
})

// Confirma o upload e persiste o avatar. A URL é montada no servidor a partir do
// cloud name e do public_id fixo do usuario — o cliente não decide a URL, então
// ninguem consegue apontar o avatar para uma imagem arbitraria ou de outra pessoa.
export async function confirmAvatarHandler(context: AuthedContext) {
  if (!isCloudinaryEnabled || !cloudinaryConfig) {
    return uploadsDisabled(context)
  }

  const user = context.get("user")
  const body = await context.req.json().catch(() => null)
  const parsed = confirmSchema.safeParse(body)

  if (!parsed.success) {
    return context.json({ code: "INVALID_DATA", message: "Dados de upload inválidos." }, 400)
  }

  const publicId = avatarPublicId(user.id)

  // f_auto/q_auto: entrega otimizada (formato e qualidade automaticos). A versao
  // (v<version>) invalida o cache do CDN a cada novo upload.
  const avatarUrl =
    `https://res.cloudinary.com/${cloudinaryConfig.cloudName}` +
    `/image/upload/f_auto,q_auto/v${parsed.data.version}/${publicId}`

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } })

  return context.json({ avatarUrl })
}
