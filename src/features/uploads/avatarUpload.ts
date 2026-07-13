import * as FileSystem from "expo-file-system/legacy"
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
// URL do avatar. As mensagens de erro sao distintas por etapa para facilitar o
// diagnostico. O envio usa FileSystem.uploadAsync (multipart nativo), confiavel
// no Android release — onde fetch + FormData com arquivo costuma falhar.
export async function uploadAvatar(localUri: string): Promise<ApiResult<{ avatarUrl: string }>> {
  const signature = await appFetch<AvatarSignature>("/uploads/avatar/signature", {
    method: "POST",
  })

  if (!signature.ok) {
    return signature
  }

  const { cloudName, apiKey, timestamp, signature: sig, publicId, overwrite, invalidate } =
    signature.data

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

  let upload: FileSystem.FileSystemUploadResult

  try {
    upload = await FileSystem.uploadAsync(endpoint, localUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      // Os valores acompanham exatamente o que foi assinado no servidor.
      parameters: {
        api_key: apiKey,
        timestamp: String(timestamp),
        signature: sig,
        public_id: publicId,
        overwrite: String(overwrite),
        invalidate: String(invalidate),
      },
    })
  } catch {
    return {
      ok: false,
      error: "Não foi possível enviar a imagem. Verifique sua conexão e tente novamente.",
    }
  }

  const payload = safeParse(upload.body) as
    | { version?: number; error?: { message?: string } }
    | null

  if (upload.status < 200 || upload.status >= 300 || !payload?.version) {
    return {
      ok: false,
      error: payload?.error?.message ?? `Falha ao enviar a imagem (código ${upload.status}).`,
    }
  }

  // Confirma no backend: ele valida e monta a URL final (o cliente não a define).
  return appFetch<{ avatarUrl: string }>("/uploads/avatar/confirm", {
    method: "POST",
    body: { version: payload.version },
  })
}

function safeParse(body: string): unknown {
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}
