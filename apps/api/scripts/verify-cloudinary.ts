// Verificacao pontual da integracao com a Cloudinary. Nao contem segredos: le as
// credenciais do ambiente (apps/api/.env) atraves do modulo de config.
//
// Uso: npx tsx apps/api/scripts/verify-cloudinary.ts
import { cloudinary, isCloudinaryEnabled } from "@/modules/uploads/cloudinary"

async function main() {
  if (!isCloudinaryEnabled) {
    console.error("Cloudinary nao configurado. Defina CLOUDINARY_* em apps/api/.env.")
    process.exit(1)
  }

  const source = "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  console.log("Enviando imagem de exemplo:", source)

  const uploaded = await cloudinary.uploader.upload(source, {
    folder: "santiago/_verify",
    public_id: `verify-${Date.now()}`,
  })

  console.log("\n✅ Upload concluido")
  console.log("  secure_url:", uploaded.secure_url)
  console.log("  public_id :", uploaded.public_id)
  console.log("  dimensoes :", `${uploaded.width}x${uploaded.height}`)
  console.log("  formato   :", uploaded.format)
  console.log("  tamanho   :", `${uploaded.bytes} bytes`)

  // f_auto (fetch_format: "auto"): entrega o melhor formato para o navegador
  // (ex.: webp/avif). q_auto (quality: "auto"): ajusta a qualidade
  // automaticamente, reduzindo o tamanho sem perda visivel perceptivel.
  const optimized = cloudinary.url(uploaded.public_id, {
    fetch_format: "auto",
    quality: "auto",
    secure: true,
  })

  console.log("\nDone! Abra o link abaixo para ver a versao otimizada (compare tamanho e formato):")
  console.log(optimized)
}

main().catch((error) => {
  console.error("Falha na verificacao da Cloudinary:", error)
  process.exit(1)
})
