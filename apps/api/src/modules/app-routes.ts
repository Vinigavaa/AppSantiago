import { type Context, Hono } from "hono"

import { createRateLimitMiddleware } from "@/http/rate-limit"
import {
  blockUserHandler,
  listBlockedUsersHandler,
  unblockUserHandler,
} from "@/modules/blocks/handlers"
import { listCategoriesHandler, listCitiesHandler } from "@/modules/catalog/handlers"
import { deleteClientAccountHandler } from "@/modules/client/account-handlers"
import {
  clientProfileHandler,
  clientReviewsHandler,
  updateClientProfileHandler,
} from "@/modules/client/profile-handlers"
import {
  deleteMessageHandler,
  listChatsHandler,
  listMessagesHandler,
  openChatHandler,
  sendMessageHandler,
} from "@/modules/chat/handlers"
import { cancelContractHandler, reportNoShowHandler } from "@/modules/contracts/handlers"
import {
  listNotificationsHandler,
  markNotificationsReadHandler,
  registerPushTokenHandler,
} from "@/modules/notifications/handlers"
import {
  listOpportunitiesHandler,
  opportunityDetailHandler,
  professionalDashboardHandler,
  professionalRejectedProposalsHandler,
} from "@/modules/professional/handlers"
import {
  professionalProfileHandler,
  professionalReviewsHandler,
  setProfessionalCategoriesHandler,
  setProfessionalCitiesHandler,
  updateProfessionalProfileHandler,
} from "@/modules/professional/profile-handlers"
import {
  createPortfolioItemHandler,
  deletePortfolioItemHandler,
} from "@/modules/professional/portfolio-handlers"
import { publicProfessionalProfileHandler } from "@/modules/professional/public-profile-handlers"
import { searchProfessionalsHandler } from "@/modules/professional/search-handlers"
import {
  completeServiceHandler,
  professionalServicesHandler,
  startServiceHandler,
} from "@/modules/professional/services-handlers"
import {
  acceptProposalHandler,
  cancelProposalHandler,
  createProposalHandler,
  listReceivedProposalsHandler,
  rejectProposalHandler,
} from "@/modules/proposals/handlers"
import { createReviewHandler } from "@/modules/reviews/handlers"
import {
  createServiceRequestHandler,
  deleteServiceRequestHandler,
  listServiceRequestsHandler,
  serviceRequestDetailHandler,
  serviceRequestsSummaryHandler,
  updateServiceRequestHandler,
} from "@/modules/service-requests/handlers"
import { requireAuth, type AuthenticatedUser } from "@/modules/shared/require-auth"
import {
  avatarSignatureHandler,
  confirmAvatarHandler,
  portfolioSignatureHandler,
  requestPhotoSignatureHandler,
} from "@/modules/uploads/handlers"

function ipKey(context: Context) {
  return `ip:${context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`
}

function isPost(path: string) {
  return (context: Context) =>
    context.req.method === "POST" && new URL(context.req.url).pathname === path
}

// Limites por IP para evitar flood/automação. A criação de propostas tem janelas
// por minuto, hora e dia (anti-spam). Uma proposta por solicitação já é garantida
// pelo índice único no banco.
const appRateLimit = createRateLimitMiddleware([
  {
    id: "app:service-request:create",
    limit: 20,
    windowMs: 60 * 60 * 1000,
    key: ipKey,
    matcher: isPost("/api/app/service-requests"),
  },
  {
    id: "app:proposal:create:minute",
    limit: 10,
    windowMs: 60 * 1000,
    key: ipKey,
    matcher: isPost("/api/app/proposals"),
  },
  {
    id: "app:proposal:create:hour",
    limit: 40,
    windowMs: 60 * 60 * 1000,
    key: ipKey,
    matcher: isPost("/api/app/proposals"),
  },
  {
    id: "app:proposal:create:day",
    limit: 150,
    windowMs: 24 * 60 * 60 * 1000,
    key: ipKey,
    matcher: isPost("/api/app/proposals"),
  },
])

export const appRoutes = new Hono<{ Variables: { user: AuthenticatedUser } }>()

appRoutes.use("*", appRateLimit)
appRoutes.use("*", requireAuth)

appRoutes.get("/categories", listCategoriesHandler)
appRoutes.get("/cities", listCitiesHandler)

appRoutes.post("/service-requests", createServiceRequestHandler)
appRoutes.get("/service-requests", listServiceRequestsHandler)
appRoutes.get("/service-requests/summary", serviceRequestsSummaryHandler)
// Rotas por id ficam após /summary para não capturarem a rota estática.
appRoutes.get("/service-requests/:id", serviceRequestDetailHandler)
appRoutes.patch("/service-requests/:id", updateServiceRequestHandler)
appRoutes.delete("/service-requests/:id", deleteServiceRequestHandler)

// Busca de profissionais: descoberta pelo cliente (nome/categoria/cidade/nota,
// com ordenação). Rota estática antes da rota com :id para não ser capturada.
appRoutes.get("/professionals", searchProfessionalsHandler)
// Perfil público do profissional: qualquer usuário autenticado pode consultar
// para decidir uma contratação. Não expõe dados de contato.
appRoutes.get("/professionals/:id", publicProfessionalProfileHandler)

// Propostas: profissional envia; cliente lista as recebidas e aceita/recusa.
appRoutes.post("/proposals", createProposalHandler)
appRoutes.get("/proposals/received", listReceivedProposalsHandler)
appRoutes.post("/proposals/:id/accept", acceptProposalHandler)
appRoutes.post("/proposals/:id/reject", rejectProposalHandler)
appRoutes.post("/proposals/:id/cancel", cancelProposalHandler)

// Avaliações: o cliente avalia o profissional após o serviço ser concluído.
appRoutes.post("/reviews", createReviewHandler)

// Chat: conversa 1:1 entre cliente e profissional. Abrir reutiliza a conversa
// existente do par; listar traz as conversas com mensagens e não-lidas.
appRoutes.post("/chats", openChatHandler)
appRoutes.get("/chats", listChatsHandler)
appRoutes.get("/chats/:id/messages", listMessagesHandler)
appRoutes.post("/chats/:id/messages", sendMessageHandler)
// Excluir mensagem enviada (apenas enquanto não foi lida pelo destinatário).
appRoutes.delete("/chats/:id/messages/:messageId", deleteMessageHandler)

// Bloqueio entre usuários: bloquear, listar bloqueados e desbloquear. O efeito
// (sumir das listas/conversas) é aplicado nos próprios handlers de chat/oportunidades.
appRoutes.post("/blocks", blockUserHandler)
appRoutes.get("/blocks", listBlockedUsersHandler)
appRoutes.delete("/blocks/:targetUserId", unblockUserHandler)

// Central de notificações: lista do usuário + marcar como lidas ao abrir.
appRoutes.get("/notifications", listNotificationsHandler)
appRoutes.post("/notifications/read", markNotificationsReadHandler)
appRoutes.post("/push-tokens", registerPushTokenHandler)

// Cancelamento de serviço: cliente ou profissional do contrato.
appRoutes.post("/contracts/:id/cancel", cancelContractHandler)
// Não comparecimento do profissional: cliente reabre a solicitação.
appRoutes.post("/contracts/:id/no-show", reportNoShowHandler)

// Área do profissional: oportunidades (solicitações abertas filtradas pela sua
// atuação/região), detalhe da oportunidade, indicadores e perfil.
appRoutes.get("/opportunities", listOpportunitiesHandler)
appRoutes.get("/opportunities/:id", opportunityDetailHandler)
appRoutes.get("/professional/dashboard", professionalDashboardHandler)
appRoutes.get("/professional/proposals/rejected", professionalRejectedProposalsHandler)
appRoutes.get("/professional/services", professionalServicesHandler)
appRoutes.post("/professional/services/:id/start", startServiceHandler)
appRoutes.post("/professional/services/:id/complete", completeServiceHandler)

// Perfil do profissional: leitura, edição de dados, atuação (categorias/cidades)
// e avaliações recebidas.
appRoutes.get("/professional/profile", professionalProfileHandler)
appRoutes.patch("/professional/profile", updateProfessionalProfileHandler)
appRoutes.put("/professional/categories", setProfessionalCategoriesHandler)
appRoutes.put("/professional/cities", setProfessionalCitiesHandler)
appRoutes.get("/professional/reviews", professionalReviewsHandler)
appRoutes.post("/professional/portfolio", createPortfolioItemHandler)
appRoutes.delete("/professional/portfolio/:id", deletePortfolioItemHandler)

// Perfil do cliente: leitura (identidade, reputação, estatísticas), edição de
// dados pessoais, avaliações recebidas e exclusão definitiva da conta.
appRoutes.get("/client/profile", clientProfileHandler)
appRoutes.patch("/client/profile", updateClientProfileHandler)
appRoutes.get("/client/reviews", clientReviewsHandler)
appRoutes.delete("/client/account", deleteClientAccountHandler)

// Upload de imagens (Cloudinary). O app pede uma assinatura, envia a imagem
// direto ao CDN e confirma; o servidor grava a URL do avatar do usuario.
appRoutes.post("/uploads/avatar/signature", avatarSignatureHandler)
appRoutes.post("/uploads/avatar/confirm", confirmAvatarHandler)
appRoutes.post("/uploads/request-photo/signature", requestPhotoSignatureHandler)
appRoutes.post("/uploads/portfolio/signature", portfolioSignatureHandler)
