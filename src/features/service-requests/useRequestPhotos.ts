import { useCallback, useRef, useState } from "react"
import { Alert } from "react-native"

import { pickRequestPhotos, uploadRequestPhoto } from "@/features/uploads/requestPhotoUpload"

export const MAX_REQUEST_PHOTOS = 6

// Foto já existente na solicitação (edição) ou recém-selecionada (em envio).
export type RequestPhotoItem =
  | { key: string; kind: "existing"; id: string; url: string }
  | {
      key: string
      kind: "new"
      localUri: string
      status: "uploading" | "done" | "error"
      publicId?: string
      version?: number
    }

type InitialPhoto = { id: string; url: string }

// Payload enviado ao backend: fotos existentes mantidas (keepPhotoIds) + novas
// enviadas (publicId + version). O backend valida a pasta e monta as URLs.
export type RequestPhotosPayload = {
  keepPhotoIds: string[]
  photos: { publicId: string; version: number }[]
}

function newKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Gerencia a lista de fotos de uma solicitação: seleção, upload por item (com
// estado individual), remoção e o payload final para criação/edição.
function toInitialItems(initial: InitialPhoto[]): RequestPhotoItem[] {
  return initial.map((photo) => ({ key: photo.id, kind: "existing", id: photo.id, url: photo.url }))
}

export function useRequestPhotos(initial: InitialPhoto[]) {
  const [items, setItems] = useState<RequestPhotoItem[]>(() => toInitialItems(initial))
  // Guarda o estado inicial para o reset (tela mantida montada pelo navegador).
  const initialItemsRef = useRef<RequestPhotoItem[]>(items)

  const isUploading = items.some((item) => item.kind === "new" && item.status === "uploading")
  const canAddMore = items.length < MAX_REQUEST_PHOTOS

  async function uploadOne(key: string, localUri: string) {
    const result = await uploadRequestPhoto(localUri)

    setItems((current) =>
      current.map((item) => {
        if (item.key !== key || item.kind !== "new") {
          return item
        }

        return result.ok
          ? { ...item, status: "done", publicId: result.data.publicId, version: result.data.version }
          : { ...item, status: "error" }
      }),
    )
  }

  async function addPhotos() {
    const remaining = MAX_REQUEST_PHOTOS - items.length

    if (remaining <= 0) {
      return
    }

    const picked = await pickRequestPhotos(remaining)

    if (picked === "denied") {
      Alert.alert(
        "Permissão necessária",
        "Autorize o acesso às suas fotos para anexá-las à solicitação.",
      )
      return
    }

    if (picked === "canceled") {
      return
    }

    const selected = picked.uris.slice(0, remaining)
    const newItems: RequestPhotoItem[] = selected.map((localUri) => ({
      key: newKey(),
      kind: "new",
      localUri,
      status: "uploading",
    }))

    setItems((current) => [...current, ...newItems])

    for (const item of newItems) {
      if (item.kind === "new") {
        void uploadOne(item.key, item.localUri)
      }
    }
  }

  function removePhoto(key: string) {
    setItems((current) => current.filter((item) => item.key !== key))
  }

  function retryPhoto(key: string) {
    setItems((current) =>
      current.map((item) =>
        item.key === key && item.kind === "new" ? { ...item, status: "uploading" } : item,
      ),
    )

    const target = items.find((item) => item.key === key)

    if (target && target.kind === "new") {
      void uploadOne(target.key, target.localUri)
    }
  }

  function getPayload(): RequestPhotosPayload {
    const keepPhotoIds = items
      .filter((item): item is Extract<RequestPhotoItem, { kind: "existing" }> => item.kind === "existing")
      .map((item) => item.id)

    const photos = items
      .filter(
        (item): item is Extract<RequestPhotoItem, { kind: "new" }> =>
          item.kind === "new" && item.status === "done" && !!item.publicId && item.version !== undefined,
      )
      .map((item) => ({ publicId: item.publicId as string, version: item.version as number }))

    return { keepPhotoIds, photos }
  }

  const reset = useCallback(() => {
    setItems(initialItemsRef.current)
  }, [])

  return { items, addPhotos, removePhoto, retryPhoto, isUploading, canAddMore, getPayload, reset }
}
