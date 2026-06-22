import { type Context, Hono } from "hono"

import { createRateLimitMiddleware } from "@/http/rate-limit"
import { listCategoriesHandler, listCitiesHandler } from "@/modules/catalog/handlers"
import {
  listOpportunitiesHandler,
  opportunityDetailHandler,
  professionalDashboardHandler,
} from "@/modules/professional/handlers"
import {
  professionalProfileHandler,
  professionalReviewsHandler,
  setProfessionalCategoriesHandler,
  setProfessionalCitiesHandler,
  updateProfessionalProfileHandler,
} from "@/modules/professional/profile-handlers"
import { professionalServicesHandler } from "@/modules/professional/services-handlers"
import {
  acceptProposalHandler,
  createProposalHandler,
  listReceivedProposalsHandler,
  rejectProposalHandler,
} from "@/modules/proposals/handlers"
import {
  createServiceRequestHandler,
  listServiceRequestsHandler,
  serviceRequestsSummaryHandler,
} from "@/modules/service-requests/handlers"
import { requireAuth, type AuthenticatedUser } from "@/modules/shared/require-auth"

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

// Propostas: profissional envia; cliente lista as recebidas e aceita/recusa.
appRoutes.post("/proposals", createProposalHandler)
appRoutes.get("/proposals/received", listReceivedProposalsHandler)
appRoutes.post("/proposals/:id/accept", acceptProposalHandler)
appRoutes.post("/proposals/:id/reject", rejectProposalHandler)

// Área do profissional: oportunidades (solicitações abertas filtradas pela sua
// atuação/região), detalhe da oportunidade, indicadores e perfil.
appRoutes.get("/opportunities", listOpportunitiesHandler)
appRoutes.get("/opportunities/:id", opportunityDetailHandler)
appRoutes.get("/professional/dashboard", professionalDashboardHandler)
appRoutes.get("/professional/services", professionalServicesHandler)

// Perfil do profissional: leitura, edição de dados, atuação (categorias/cidades)
// e avaliações recebidas.
appRoutes.get("/professional/profile", professionalProfileHandler)
appRoutes.patch("/professional/profile", updateProfessionalProfileHandler)
appRoutes.put("/professional/categories", setProfessionalCategoriesHandler)
appRoutes.put("/professional/cities", setProfessionalCitiesHandler)
appRoutes.get("/professional/reviews", professionalReviewsHandler)
