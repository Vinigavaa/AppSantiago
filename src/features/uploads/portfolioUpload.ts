import * as ImagePicker from "expo-image-picker"

import { appFetch, type ApiResult } from "@/lib/api-client"

import { postToCloudinary } from "./cloudinaryUpload"

type PortfolioSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
}

export type PickResult = { uri: string } | "canceled" | "denied"

// Seleciona uma imagem para o portfólio (com leve compressao).
export async function pickPortfolioImage(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) {
    return "denied"
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
  })

  if (result.canceled || !result.assets[0]) {
    return "canceled"
  }

  return { uri: result.assets[0].uri }
}

// Envia a imagem do portfólio direto para a Cloudinary (upload assinado). Devolve
// public_id + versao para o backend validar a pasta e persistir a URL.
export async function uploadPortfolioImage(
  localUri: string,
): Promise<ApiResult<{ publicId: string; version: number }>> {
  const signature = await appFetch<PortfolioSignature>("/uploads/portfolio/signature", {
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
