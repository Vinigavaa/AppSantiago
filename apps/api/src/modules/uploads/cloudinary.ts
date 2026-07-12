import { v2 as cloudinary } from "cloudinary"

import { cloudinaryConfig } from "@/config/env"

// Configura o SDK uma unica vez, se as credenciais estiverem presentes. O secret
// nunca sai do servidor: toda operacao autenticada (upload/assinatura) passa aqui.
if (cloudinaryConfig) {
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
    secure: true,
  })
}

// Indica se o recurso de imagens esta habilitado (credenciais configuradas).
export const isCloudinaryEnabled = cloudinaryConfig !== null

export { cloudinary }
