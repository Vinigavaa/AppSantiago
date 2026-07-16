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

// Apaga arquivos especificos pelo public_id. Recebe uma lista porque as remocoes
// vem em lote (as fotos de uma solicitacao, por exemplo) e uma unica chamada e
// mais barata que uma por imagem.
//
// Entradas nulas sao descartadas: `publicId` e opcional no banco, entao fotos
// anteriores a essa coluna simplesmente nao tem como ser apagadas aqui.
//
// Nunca lanca, pela mesma razao de deleteUserImages: a linha ja saiu do banco.
export async function deleteImages(publicIds: (string | null)[]): Promise<void> {
  if (!isCloudinaryEnabled) {
    return
  }

  const ids = publicIds.filter((id): id is string => id !== null)

  if (ids.length === 0) {
    return
  }

  try {
    await cloudinary.api.delete_resources(ids, { invalidate: true })
  } catch (error) {
    console.error(`[uploads] falha ao remover ${ids.length} imagem(ns)`, error)
  }
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
