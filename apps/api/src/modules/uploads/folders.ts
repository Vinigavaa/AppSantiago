// Caminhos das imagens na Cloudinary. Funcoes puras, sem dependencia de HTTP ou
// banco: sao usadas tanto pelos handlers de upload quanto pela limpeza de conta.

// Pasta fixa dos avatares. O public_id inclui o id do usuario, então cada um só
// pode escrever o proprio avatar e um novo upload sobrescreve o anterior.
const AVATAR_FOLDER = "santiago/avatars"

export function avatarPublicId(userId: string): string {
  return `${AVATAR_FOLDER}/${userId}`
}

// Pasta das fotos de solicitacao, isolada por usuario. Os uploads recebem um
// public_id gerado pela Cloudinary dentro desta pasta; a validacao no backend
// confere que o public_id pertence a ela (o cliente não aponta para outra coisa).
export function requestPhotosFolder(userId: string): string {
  return `santiago/requests/${userId}`
}

// Pasta do portfolio do profissional, isolada por usuario.
export function portfolioFolder(userId: string): string {
  return `santiago/portfolio/${userId}`
}

// Pasta dos anexos de chat, isolada por remetente. Isolar por usuario (e nao por
// conversa) mantem a limpeza da conta funcionando por prefixo.
export function chatAttachmentsFolder(userId: string): string {
  return `santiago/chat/${userId}`
}
