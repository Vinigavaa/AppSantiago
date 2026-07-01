import type { Prisma } from "@prisma/client"

// Inclui as relações necessárias para montar o item retornado ao cliente.
export const serviceRequestInclude = {
  category: { select: { id: true, name: true } },
  city: { select: { id: true, name: true, state: true } },
  _count: { select: { proposals: true, photos: true } },
} satisfies Prisma.ServiceRequestInclude

type ServiceRequestWithRelations = Prisma.ServiceRequestGetPayload<{
  include: typeof serviceRequestInclude
}>

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value)
}

// Formato estável consumido pelo mobile. Não expõe endereço/localização precisa.
export function serializeServiceRequest(request: ServiceRequestWithRelations) {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    urgency: request.urgency,
    category: request.category,
    city: request.city,
    neighborhood: request.addressNeighborhood,
    budgetMin: toNumber(request.budgetMin),
    budgetMax: toNumber(request.budgetMax),
    proposalsCount: request._count.proposals,
    photosCount: request._count.photos,
    createdAt: request.createdAt.toISOString(),
  }
}

// Include extra usado apenas na listagem do próprio cliente: traz o contrato e
// se ele já avaliou, para habilitar o fluxo de avaliação. Não é exposto a outros.
export const clientServiceRequestInclude = {
  ...serviceRequestInclude,
  serviceContract: {
    select: {
      id: true,
      status: true,
      professional: { select: { user: { select: { name: true } } } },
    },
  },
} satisfies Prisma.ServiceRequestInclude

type ClientServiceRequestWithRelations = Prisma.ServiceRequestGetPayload<{
  include: typeof clientServiceRequestInclude
}>

export function serializeClientServiceRequest(
  request: ClientServiceRequestWithRelations,
  reviewedContractIds: Set<string>,
) {
  const contract = request.serviceContract

  return {
    ...serializeServiceRequest(request),
    contract: contract
      ? {
          id: contract.id,
          status: contract.status,
          professionalName: contract.professional.user.name,
          reviewed: reviewedContractIds.has(contract.id),
        }
      : null,
  }
}

// Detalhe completo consumido apenas pelo próprio cliente dono da solicitação.
// Diferente da listagem/oportunidades, aqui o endereço completo é exposto — a
// autorização (posse) é validada no handler antes de serializar.
export const serviceRequestDetailInclude = {
  category: { select: { id: true, name: true } },
  city: { select: { id: true, name: true, state: true } },
  photos: { select: { id: true, url: true }, orderBy: { createdAt: "asc" } },
  _count: { select: { proposals: true } },
  serviceContract: {
    select: {
      id: true,
      status: true,
      professional: {
        select: { id: true, user: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.ServiceRequestInclude

type ServiceRequestDetailWithRelations = Prisma.ServiceRequestGetPayload<{
  include: typeof serviceRequestDetailInclude
}>

export function serializeServiceRequestDetail(
  request: ServiceRequestDetailWithRelations,
  reviewed: boolean,
) {
  const contract = request.serviceContract

  return {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    urgency: request.urgency,
    category: request.category,
    city: request.city,
    address: {
      zipCode: request.addressZipCode,
      street: request.addressStreet,
      number: request.addressNumber,
      neighborhood: request.addressNeighborhood,
      complement: request.addressComplement,
    },
    budgetMin: toNumber(request.budgetMin),
    budgetMax: toNumber(request.budgetMax),
    proposalsCount: request._count.proposals,
    photos: request.photos,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    contract: contract
      ? {
          id: contract.id,
          status: contract.status,
          professionalId: contract.professional.id,
          professionalName: contract.professional.user.name,
          reviewed,
        }
      : null,
  }
}
