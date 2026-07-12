import * as ImagePicker from "expo-image-picker"

import { appFetch, type ApiResult } from "@/lib/api-client"

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

// Fluxo de upload assinado: pede a assinatura à API, envia a imagem direto para
// a Cloudinary (os bytes não passam pelo servidor) e confirma para persistir a
// URL do avatar. Retorna a URL final gravada pelo backend.
export async function uploadAvatar(localUri: string): Promise<ApiResult<{ avatarUrl: string }>> {
  const signature = await appFetch<AvatarSignature>("/uploads/avatar/signature", {
    method: "POST",
  })

  if (!signature.ok) {
    return signature
  }

  const { cloudName, apiKey, timestamp, signature: sig, publicId, overwrite, invalidate } =
    signature.data

  const form = new FormData()
  // No React Native o arquivo é um objeto { uri, name, type }; o cast satisfaz o
  // tipo de FormData sem alterar o comportamento em runtime.
  form.append("file", { uri: localUri, name: "avatar.jpg", type: "image/jpeg" } as unknown as Blob)
  form.append("api_key", apiKey)
  form.append("timestamp", String(timestamp))
  form.append("signature", sig)
  form.append("public_id", publicId)
  form.append("overwrite", String(overwrite))
  form.append("invalidate", String(invalidate))

  let cloudResponse: Response

  try {
    cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: form,
    })
  } catch {
    return { ok: false, error: "Não foi possível enviar a imagem. Verifique sua conexão." }
  }

  const payload = (await cloudResponse.json().catch(() => null)) as
    | { version?: number; error?: { message?: string } }
    | null

  if (!cloudResponse.ok || !payload?.version) {
    return { ok: false, error: payload?.error?.message ?? "Falha ao enviar a imagem." }
  }

  // Confirma no backend: ele valida e monta a URL final (o cliente não a define).
  return appFetch<{ avatarUrl: string }>("/uploads/avatar/confirm", {
    method: "POST",
    body: { version: payload.version },
  })
}
