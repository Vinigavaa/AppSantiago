import { prisma } from "@santiago/database"
import type { Prisma } from "@prisma/client"

import type { AuthedContext } from "@/modules/shared/require-auth"

import { getOrCreateProfessionalProfileId } from "./professional-context"

// Relações do contrato exibidas em "Meus Serviços". Inclui o endereço completo,
// que só é liberado aqui — para o profissional efetivamente contratado.
const contractInclude = {
  proposal: { select: { price: true, estimatedDays: true } },
  serviceRequest: {
    select: {
      id: true,
      title: true,
      description: true,
      category: { select: { name: true } },
      city: { select: { name: true, state: true } },
      addressStreet: true,
      addressNumber: true,
      addressNeighborhood: true,
      addressComplement: true,
      addressZipCode: true,
      client: { select: { user: { select: { name: true, phone: true } } } },
    },
  },
} satisfies Prisma.ServiceContractInclude

type ContractWithRelations = Prisma.ServiceContractGetPayload<{ include: typeof contractInclude }>

function serializeContractedService(contract: ContractWithRelations) {
  const request = contract.serviceRequest

  return {
    id: contract.id,
    status: contract.status,
    acceptedAt: contract.acceptedAt.toISOString(),
    startedAt: contract.startedAt?.toISOString() ?? null,
    completedAt: contract.completedAt?.toISOString() ?? null,
    price: Number(contract.proposal.price),
    estimatedDays: contract.proposal.estimatedDays,
    serviceRequest: {
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.category.name,
      city: { name: request.city.name, state: request.city.state },
      // Endereço completo liberado apenas para o profissional contratado.
      address: {
        street: request.addressStreet,
        number: request.addressNumber,
        neighborhood: request.addressNeighborhood,
        complement: request.addressComplement,
        zipCode: request.addressZipCode,
      },
    },
    client: {
      name: request.client.user.name,
      phone: request.client.user.phone,
    },
  }
}

// "Meus Serviços": contratos do profissional (contratados, em andamento,
// concluídos). Aparecem automaticamente assim que o cliente aceita a proposta.
export async function professionalServicesHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return context.json({ code: "FORBIDDEN", message: "Disponível apenas para profissionais." }, 403)
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  const contracts = await prisma.serviceContract.findMany({
    where: { professionalId },
    include: contractInclude,
    orderBy: { acceptedAt: "desc" },
  })

  return context.json({ services: contracts.map(serializeContractedService) })
}
