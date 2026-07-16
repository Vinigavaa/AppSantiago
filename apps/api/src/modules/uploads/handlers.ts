import { prisma } from "@santiago/database"
import { z } from "zod"

import { cloudinaryConfig } from "@/config/env"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { cloudinary, isCloudinaryEnabled } from "./cloudinary"
import { avatarPublicId, portfolioFolder, requestPhotosFolder } from "./folders"

// Monta a URL de entrega otimizada (f_auto/q_auto) a partir do public_id e da
// versao. Retorna null se a Cloudinary não estiver configurada.
export function buildCloudinaryImageUrl(publicId: string, version: number): string | null {
  if (!cloudinaryConfig) {
    return null
  }

  return (
    `https://res.cloudinary.com/${cloudinaryConfig.cloudName}` +
    `/image/upload/f_auto,q_auto/v${version}/${publicId}`
  )
}

function uploadsDisabled(context: AuthedContext) {
  return context.json(
    { code: "UPLOADS_DISABLED", message: "O envio de imagens está indisponível no momento." },
    503,
  )
}

// Valida que um public_id pertence à pasta esperada e monta a URL final. Garante
// que ninguem anexa uma imagem arbitraria ou de outra pessoa; a URL é sempre
// montada no servidor. Retorna null quando o public_id ou a config não conferem.
export function resolveScopedPhotoUrl(
  folder: string,
  publicId: string,
  version: number,
): string | null {
  if (!publicId.startsWith(`${folder}/`)) {
    return null
  }

  return buildCloudinaryImageUrl(publicId, version)
}

// Foto ja validada: a URL montada pelo servidor e o public_id que a originou. O
// public_id fica junto porque e o unico jeito de apagar o arquivo no CDN depois.
export type ResolvedPhoto = { url: string; publicId: string }

// Resolve uma lista de fotos de solicitacao (todas na pasta do usuario).
export function resolveRequestPhotos(
  userId: string,
  photos: { publicId: string; version: number }[],
): { ok: true; photos: ResolvedPhoto[] } | { ok: false } {
  const folder = requestPhotosFolder(userId)
  const resolved: ResolvedPhoto[] = []

  for (const photo of photos) {
    const url = resolveScopedPhotoUrl(folder, photo.publicId, photo.version)

    if (!url) {
      return { ok: false }
    }

    resolved.push({ url, publicId: photo.publicId })
  }

  return { ok: true, photos: resolved }
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

  const avatarUrl = buildCloudinaryImageUrl(avatarPublicId(user.id), parsed.data.version)

  if (!avatarUrl) {
    return uploadsDisabled(context)
  }

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } })

  return context.json({ avatarUrl })
}

// Assinatura para as fotos de uma solicitacao. Diferente do avatar, cada foto tem
// um public_id proprio (gerado pela Cloudinary) dentro da pasta do usuario, então
// assinamos a pasta em vez de um public_id fixo — permitindo varias fotos.
export async function requestPhotoSignatureHandler(context: AuthedContext) {
  if (!isCloudinaryEnabled || !cloudinaryConfig) {
    return uploadsDisabled(context)
  }

  const user = context.get("user")
  const timestamp = Math.round(Date.now() / 1000)
  const folder = requestPhotosFolder(user.id)

  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, cloudinaryConfig.apiSecret)

  return context.json({
    cloudName: cloudinaryConfig.cloudName,
    apiKey: cloudinaryConfig.apiKey,
    timestamp,
    signature,
    folder,
  })
}

// Assinatura para as imagens do portfolio do profissional (pasta por usuario).
export async function portfolioSignatureHandler(context: AuthedContext) {
  if (!isCloudinaryEnabled || !cloudinaryConfig) {
    return uploadsDisabled(context)
  }

  const user = context.get("user")
  const timestamp = Math.round(Date.now() / 1000)
  const folder = portfolioFolder(user.id)

  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, cloudinaryConfig.apiSecret)

  return context.json({
    cloudName: cloudinaryConfig.cloudName,
    apiKey: cloudinaryConfig.apiKey,
    timestamp,
    signature,
    folder,
  })
}
