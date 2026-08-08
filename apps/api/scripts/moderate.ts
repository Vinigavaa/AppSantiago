// Ferramenta de moderação. É por aqui que uma denúncia vira ação dentro do prazo
// de 24h, sem alteração manual no banco e sem expor uma superfície pública nova.
//
// Uso: npm run moderate -- <comando> [argumentos]
//
//   list                            denúncias pendentes (atrasadas primeiro)
//   show <reportId>                 conteúdo denunciado e contexto do caso
//   hide <reportId> [motivo]        oculta o conteúdo denunciado
//   suspend <userId> <motivo>       suspende o usuário (perde acesso ao app)
//   unsuspend <userId>              reativa o usuário
//   resolve <reportId> <nota>       fecha a denúncia como resolvida
//   dismiss <reportId> <nota>       fecha a denúncia como improcedente
//
// DATABASE_URL precisa estar disponível (apps/api/.env ou ambiente).

const PRAZO_HORAS = 24

function fail(message: string): never {
  console.error(`\n${message}\n`)
  process.exit(1)
}

// A conexão é validada antes de qualquer import do Prisma: sem DATABASE_URL o
// client lança uma exceção crua na carga do módulo, o que não ajuda o operador.
if (!process.env.DATABASE_URL) {
  const { config } = await import("dotenv")
  const { resolve } = await import("node:path")

  for (const envPath of [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "apps/api/.env"),
    resolve(process.cwd(), "../../.env"),
  ]) {
    config({ path: envPath, override: false })
  }

  if (!process.env.DATABASE_URL) {
    fail(
      "DATABASE_URL não configurada.\n" +
        "Defina em apps/api/.env (local) ou exporte a variável do banco de produção antes de rodar.",
    )
  }
}

const { prisma } = await import("@santiago/database")
const {
  dismissReport,
  hideContent,
  resolveReport,
  suspendUser,
  unsuspendUser,
} = await import("@/modules/moderation/actions")
const { resolveReportTarget } = await import("@/modules/reports/service")

function hoursSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (60 * 60 * 1000))
}

async function listPending() {
  const reports = await prisma.contentReport.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      createdAt: true,
      reporter: { select: { id: true, email: true } },
    },
  })

  if (reports.length === 0) {
    console.log("\nNenhuma denúncia pendente.\n")
    return
  }

  // Atrasadas primeiro: são as que já estouraram o prazo de 24h e definem a
  // ordem de trabalho do operador.
  const overdue = reports.filter((report) => hoursSince(report.createdAt) >= PRAZO_HORAS)
  const onTime = reports.filter((report) => hoursSince(report.createdAt) < PRAZO_HORAS)

  console.log(`\n${reports.length} denúncia(s) pendente(s):\n`)

  for (const report of [...overdue, ...onTime]) {
    const waiting = hoursSince(report.createdAt)
    const flag = waiting >= PRAZO_HORAS ? "⚠ ATRASADA" : "  no prazo "

    console.log(`${flag}  ${report.id}`)
    console.log(`            ${report.reason} em ${report.targetType} (${report.targetId})`)
    console.log(`            denunciante: ${report.reporter.email}  •  há ${waiting}h`)

    if (report.details) {
      console.log(`            detalhe: ${report.details}`)
    }

    console.log("")
  }

  console.log("Detalhe de um caso: npm run moderate -- show <reportId>\n")
}

async function showReport(reportId: string) {
  const report = await prisma.contentReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      resolutionNote: true,
      reporter: { select: { id: true, email: true, name: true } },
    },
  })

  if (!report) {
    fail(`Denúncia ${reportId} não encontrada.`)
  }

  const target = await resolveReportTarget(report.targetType, report.targetId)

  const author = target
    ? await prisma.user.findUnique({
        where: { id: target.authorUserId },
        select: { id: true, name: true, email: true, suspendedAt: true },
      })
    : null

  console.log(`\nDenúncia ${report.id}`)
  console.log(`  status ........ ${report.status}`)
  console.log(`  motivo ........ ${report.reason}`)
  console.log(`  aberta há ..... ${hoursSince(report.createdAt)}h (${report.createdAt.toISOString()})`)
  console.log(`  detalhe ....... ${report.details ?? "(não informado)"}`)
  console.log(`  denunciante ... ${report.reporter.name} <${report.reporter.email}> (${report.reporter.id})`)
  console.log(`\n  alvo .......... ${report.targetType} ${report.targetId}`)

  if (!target) {
    console.log("  conteúdo ...... (não existe mais — pode ter sido excluído pelo autor)")
  } else {
    console.log(`  conteúdo ...... ${target.summary}`)
    console.log(
      `  autor ......... ${author?.name} <${author?.email}> (${target.authorUserId})` +
        (author?.suspendedAt ? "  [JÁ SUSPENSO]" : ""),
    )
  }

  if (report.resolvedAt) {
    console.log(`\n  decidida em ... ${report.resolvedAt.toISOString()}`)
    console.log(`  nota .......... ${report.resolutionNote ?? "(sem nota)"}`)
  }

  if (report.status === "PENDING") {
    console.log("\n  Ações:")
    console.log(`    npm run moderate -- hide ${report.id} "motivo"`)

    if (target) {
      console.log(`    npm run moderate -- suspend ${target.authorUserId} "motivo"`)
    }

    console.log(`    npm run moderate -- resolve ${report.id} "o que foi feito"`)
    console.log(`    npm run moderate -- dismiss ${report.id} "por que não procede"`)
  }

  console.log("")
}

async function hideReportedContent(reportId: string, reason: string) {
  const report = await prisma.contentReport.findUnique({
    where: { id: reportId },
    select: { targetType: true, targetId: true },
  })

  if (!report) {
    fail(`Denúncia ${reportId} não encontrada.`)
  }

  const outcome = await hideContent(report.targetType, report.targetId, reason)

  if (!outcome.ok) {
    fail(outcome.message)
  }

  console.log(`\n${outcome.message}`)
  console.log(`Lembre de fechar o caso: npm run moderate -- resolve ${reportId} "conteúdo ocultado"\n`)
}

function requireArg(value: string | undefined, message: string): string {
  if (!value?.trim()) {
    fail(message)
  }

  return value.trim()
}

async function main() {
  const [command, first, second] = process.argv.slice(2)

  switch (command) {
    case "list":
      await listPending()
      break

    case "show":
      await showReport(requireArg(first, "Informe o id da denúncia: moderate -- show <reportId>"))
      break

    case "hide":
      await hideReportedContent(
        requireArg(first, "Informe o id da denúncia: moderate -- hide <reportId> [motivo]"),
        second?.trim() || "Conteúdo removido por violar as regras da comunidade.",
      )
      break

    case "suspend": {
      const outcome = await suspendUser(
        requireArg(first, "Informe o id do usuário: moderate -- suspend <userId> <motivo>"),
        requireArg(second, "Informe o motivo da suspensão (o usuário vê esta mensagem)."),
      )

      if (!outcome.ok) {
        fail(outcome.message)
      }

      console.log(`\n${outcome.message}\n`)
      break
    }

    case "unsuspend": {
      const outcome = await unsuspendUser(
        requireArg(first, "Informe o id do usuário: moderate -- unsuspend <userId>"),
      )

      if (!outcome.ok) {
        fail(outcome.message)
      }

      console.log(`\n${outcome.message}\n`)
      break
    }

    case "resolve":
    case "dismiss": {
      const reportId = requireArg(first, `Informe o id da denúncia: moderate -- ${command} <reportId> <nota>`)
      const note = requireArg(second, "Escreva uma nota curta explicando a decisão.")
      const outcome =
        command === "resolve" ? await resolveReport(reportId, note) : await dismissReport(reportId, note)

      if (!outcome.ok) {
        fail(outcome.message)
      }

      console.log(`\n${outcome.message}\n`)
      break
    }

    default:
      console.log(
        [
          "",
          "Moderação — uso: npm run moderate -- <comando>",
          "",
          "  list                        denúncias pendentes (atrasadas primeiro)",
          "  show <reportId>             conteúdo denunciado e contexto do caso",
          "  hide <reportId> [motivo]    oculta o conteúdo denunciado",
          "  suspend <userId> <motivo>   suspende o usuário (perde acesso ao app)",
          "  unsuspend <userId>          reativa o usuário",
          "  resolve <reportId> <nota>   fecha a denúncia como resolvida",
          "  dismiss <reportId> <nota>   fecha a denúncia como improcedente",
          "",
        ].join("\n"),
      )
  }
}

main()
  .catch((error) => {
    fail(`Falha ao executar: ${error instanceof Error ? error.message : String(error)}`)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
