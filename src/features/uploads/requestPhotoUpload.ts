import * as ImagePicker from "expo-image-picker"

import { appFetch, type ApiResult } from "@/lib/api-client"

import { postToCloudinary } from "./cloudinaryUpload"

type RequestPhotoSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
}

export type UploadedRequestPhoto = { publicId: string; version: number; url: string }

export type PickManyResult = { uris: string[] } | "canceled" | "denied"

// Seleciona ate `limit` fotos da galeria (sem recorte, com compressao).
export async function pickRequestPhotos(limit: number): Promise<PickManyResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) {
    return "denied"
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.6,
  })

  if (result.canceled || result.assets.length === 0) {
    return "canceled"
  }

  return { uris: result.assets.map((asset) => asset.uri) }
}

// Envia uma foto de solicitacao: pede a assinatura (pasta do usuario) e envia
// direto para a Cloudinary. Devolve public_id + versao para o backend persistir.
export async function uploadRequestPhoto(
  localUri: string,
): Promise<ApiResult<UploadedRequestPhoto>> {
  const signature = await appFetch<RequestPhotoSignature>("/uploads/request-photo/signature", {
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

  return {
    ok: true,
    data: {
      publicId: uploaded.data.publicId,
      version: uploaded.data.version,
      url: uploaded.data.secureUrl,
    },
  }
}
