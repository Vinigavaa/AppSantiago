import * as ImagePicker from "expo-image-picker"

import { appFetch, type ApiResult } from "@/lib/api-client"

import { postToCloudinary } from "./cloudinaryUpload"

type ChatAttachmentSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
}

export type UploadedChatAttachment = { publicId: string; version: number }

export type PickResult = { uri: string } | "canceled" | "denied"

// Seleciona uma foto da galeria para anexar na conversa (sem recorte, com
// compressao — a mesma qualidade usada nas fotos de solicitacao).
export async function pickChatImage(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) {
    return "denied"
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.6,
  })

  if (result.canceled || result.assets.length === 0) {
    return "canceled"
  }

  return { uri: result.assets[0]!.uri }
}

// Envia o anexo: pede a assinatura (pasta do usuario) e envia direto para a
// Cloudinary. Devolve public_id + versao para o backend montar a URL final.
export async function uploadChatAttachment(
  localUri: string,
): Promise<ApiResult<UploadedChatAttachment>> {
  const signature = await appFetch<ChatAttachmentSignature>("/uploads/chat-attachment/signature", {
    method: "POST",
  })

  if (!signature.ok) {
    return signature
  }

  const { cloudName, apiKey, timestamp, signature: sig, folder } = signature.data

  const uploaded = await postToCloudinary(localUri, cloudName, {
    api_key: apiKey,
    timestamp: String(timestamp),
    signature: sig,
    folder,
  })

  if (!uploaded.ok) {
    return uploaded
  }

  return { ok: true, data: { publicId: uploaded.data.publicId, version: uploaded.data.version } }
}
