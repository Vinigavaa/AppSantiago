import * as FileSystem from "expo-file-system/legacy"

import type { ApiResult } from "@/lib/api-client"

export type CloudinaryUpload = { publicId: string; version: number; secureUrl: string }

// Envia um arquivo local direto para a Cloudinary usando o upload multipart nativo
// do expo-file-system (confiavel no Android release, onde fetch + FormData falha).
// Os `parameters` acompanham exatamente o que foi assinado no servidor.
export async function postToCloudinary(
  localUri: string,
  cloudName: string,
  parameters: Record<string, string>,
): Promise<ApiResult<CloudinaryUpload>> {
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

  let upload: FileSystem.FileSystemUploadResult

  try {
    upload = await FileSystem.uploadAsync(endpoint, localUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      parameters,
    })
  } catch {
    return {
      ok: false,
      error: "Não foi possível enviar a imagem. Verifique sua conexão e tente novamente.",
    }
  }

  const payload = safeParse(upload.body) as
    | { version?: number; public_id?: string; secure_url?: string; error?: { message?: string } }
    | null

  if (upload.status < 200 || upload.status >= 300 || !payload?.version || !payload.public_id) {
    return {
      ok: false,
      error: payload?.error?.message ?? `Falha ao enviar a imagem (código ${upload.status}).`,
    }
  }

  return {
    ok: true,
    data: {
      publicId: payload.public_id,
      version: payload.version,
      secureUrl: payload.secure_url ?? "",
    },
  }
}

function safeParse(body: string): unknown {
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}
