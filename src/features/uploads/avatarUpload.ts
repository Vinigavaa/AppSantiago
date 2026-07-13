import * as ImagePicker from "expo-image-picker"

import { appFetch, type ApiResult } from "@/lib/api-client"

import { postToCloudinary } from "./cloudinaryUpload"

type AvatarSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  publicId: string
  overwrite: boolean
  invalidate: boolean
}

export type PickResult = { uri: string } | "canceled" | "denied"

// Abre a galeria com recorte quadrado e compressao. Devolve o uri local, ou um
// motivo (cancelado/permissao negada) para a UI dar a mensagem adequada.
export async function pickAvatarImage(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) {
    return "denied"
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  })

  if (result.canceled || !result.assets[0]) {
    return "canceled"
  }

  return { uri: result.assets[0].uri }
}

// Fluxo de upload assinado do avatar: pede a assinatura à API, envia a imagem
// direto para a Cloudinary e confirma para persistir a URL (montada no servidor).
export async function uploadAvatar(localUri: string): Promise<ApiResult<{ avatarUrl: string }>> {
  const signature = await appFetch<AvatarSignature>("/uploads/avatar/signature", {
    method: "POST",
  })

  if (!signature.ok) {
    return signature
  }

  const { cloudName, apiKey, timestamp, signature: sig, publicId, overwrite, invalidate } =
    signature.data

  const uploaded = await postToCloudinary(localUri, cloudName, {
    api_key: apiKey,
    timestamp: String(timestamp),
    signature: sig,
    public_id: publicId,
    overwrite: String(overwrite),
    invalidate: String(invalidate),
  })

  if (!uploaded.ok) {
    return uploaded
  }

  // Confirma no backend: ele valida e monta a URL final (o cliente não a define).
  return appFetch<{ avatarUrl: string }>("/uploads/avatar/confirm", {
    method: "POST",
    body: { version: uploaded.data.version },
  })
}
