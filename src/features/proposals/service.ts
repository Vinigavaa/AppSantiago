import { appFetch, type ApiResult } from "@/lib/api-client"

import type { CreateProposalInput, OwnProposal, ReceivedProposal } from "./types"

// Cliente: propostas recebidas em todas as suas solicitações.
export async function fetchReceivedProposals(): Promise<ApiResult<ReceivedProposal[]>> {
  const result = await appFetch<{ proposals: ReceivedProposal[] }>("/proposals/received")
  return result.ok ? { ok: true, data: result.data.proposals } : result
}

// Profissional: envia uma proposta para uma solicitação aberta.
export async function sendProposal(
  input: CreateProposalInput,
): Promise<ApiResult<OwnProposal>> {
  const result = await appFetch<{ proposal: OwnProposal }>("/proposals", {
    method: "POST",
    body: input,
  })
  return result.ok ? { ok: true, data: result.data.proposal } : result
}
