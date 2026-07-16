import { cloudinary, isCloudinaryEnabled } from "./cloudinary"
import { avatarPublicId, portfolioFolder, requestPhotosFolder } from "./folders"

// Remocao das imagens de um usuario na Cloudinary.
//
// A exclusao e feita por prefixo porque o public_id nao e persistido no banco
// (hoje so guardamos a URL final). Isso e seguro aqui: o id do usuario e um UUID
// de tamanho fixo, entao nenhum id e prefixo de outro e o alcance nunca vaza para
// as imagens de terceiros.
//
// `invalidate` purga o cache do CDN: sem isso a imagem continuaria acessivel pela
// URL antiga mesmo depois de apagada da conta — o oposto do objetivo.
async function deleteByPrefix(prefix: string): Promise<void> {
  await cloudinary.api.delete_resources_by_prefix(prefix, { invalidate: true })
}

// Apaga todas as imagens do usuario (avatar, fotos de solicitacao e portfolio).
//
// Nunca lanca: e chamada depois que a conta ja foi excluida do banco, entao uma
// falha do CDN nao pode derrubar a operacao. O erro vai para o log com o contexto
// necessario para a limpeza manual.
export async function deleteUserImages(userId: string): Promise<void> {
  if (!isCloudinaryEnabled) {
    return
  }

  // Todas as pastas onde um usuario pode ter imagens. A do portfolio fica vazia
  // para clientes, mas entra na lista para que a funcao continue correta quando a
  // exclusao de conta de profissional existir.
  const prefixes = [avatarPublicId(userId), requestPhotosFolder(userId), portfolioFolder(userId)]

  for (const prefix of prefixes) {
    try {
      await deleteByPrefix(prefix)
    } catch (error) {
      console.error(`[uploads] falha ao remover imagens em "${prefix}"`, error)
    }
  }
}
