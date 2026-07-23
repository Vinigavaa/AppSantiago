## Context

O marketplace (Expo/React Native + API Hono + Prisma/Postgres) hoje trata todos os
profissionais igualmente e não tem receita. Queremos assinatura paga só para profissionais,
cobrada pelas lojas (Google Play Billing / Apple StoreKit), liberando vantagens
server-authoritative. O app já usa EAS Build (não Expo Go), tem módulos `proposals`,
`professional/search` e perfil público onde as vantagens plugam. A API roda no Render com
deploy automático do `main`.

**Regra de plataforma (checagem pedida):** vender desbloqueio de funcionalidades digitais
dentro do app **obriga** o uso da compra da loja (Apple 3.1.1 / Google Play Payments). O
plano proposto já faz exatamente isso — está em conformidade. Pontos de atenção que as lojas
exigem e que este design cobre: (1) botão "Restaurar compra" é obrigatório na Apple;
(2) o texto de assinatura auto-renovável precisa mostrar título, duração, preço por período,
"renova automaticamente até ser cancelada" e links de Termos e Privacidade perto do botão de
compra; (3) o certificado deve deixar claro que é selo de participação, não credencial
oficial, para não violar regras de conteúdo enganoso.

## Goals / Non-Goals

**Goals:**
- Servidor como única fonte de verdade do status de assinatura e das vantagens.
- Ativação só após verificação da compra com a loja (recibo Apple + compra Google).
- Renovação, cancelamento, grace period e restore refletidos com fidelidade.
- Robustez a app fechado no meio do pagamento (webhooks + reconciliação periódica).
- Funcionar em Android e iOS com o mínimo de código específico de plataforma.

**Non-Goals:**
- Cobrança fora das lojas / gateway de cartão próprio (proibido para conteúdo digital).
- Pagamento por clientes (clientes seguem gratuitos).
- Reembolso/gestão financeira além de refletir o que a loja informar.
- Refazer portfólio, categorias ou avaliação por estrelas (já existem; são reutilizados).
- Nível/tiers além de mensal e anual.

## Decisions

### D1 — Biblioteca de billing: RevenueCat (`react-native-purchases`)
Usar RevenueCat em vez de integrar StoreKit/Play Billing direto. Ele unifica as duas lojas
numa API só, entrega a verificação de recibo server-side, os webhooks normalizados, o
"entitlement", restore e grace period prontos, e reduz muito o código de plataforma.
- **Por quê:** implementar verificação de recibo Apple (App Store Server API + JWS) e Google
  (Play Developer API) na mão é trabalhoso e fácil de errar; RevenueCat cobre isso e alinha
  com a filosofia "clareza > esperteza / simplicidade > abstração precoce".
- **Papel dele vs. nosso servidor:** RevenueCat verifica com as lojas; **mas a fonte de
  verdade das vantagens continua no nosso servidor.** Recebemos o webhook do RevenueCat
  (autenticado) e podemos reconferir o status via API do RevenueCat na reconciliação. O app
  nunca decide vantagem; ele só dispara a compra e reporta.
- **Alternativa considerada:** StoreKit 2 + Google Play Billing diretos com verificação
  própria. Mais controle e sem dependência de terceiro, porém muito mais código, dois fluxos
  de webhook distintos (App Store Server Notifications V2 + Google RTDN via Pub/Sub) e maior
  superfície de bug. Rejeitada nesta fase; a arquitetura abaixo isola o provedor para permitir
  trocar depois se necessário.
- **Requer:** dev client / build EAS (não roda em Expo Go) e config plugin no `app.json`.

### D2 — Modelo de dados
Novas tabelas em `packages/database` (migration obrigatória):
- `ProfessionalSubscription` (1:1 com `ProfessionalProfile`): `plan` (MONTHLY|ANNUAL),
  `status` (ACTIVE|IN_GRACE|CANCELED|EXPIRED), `store` (GOOGLE_PLAY|APP_STORE),
  `storeProductId`, `originalTransactionId`/`purchaseToken`, `currentPeriodEnd`,
  `gracePeriodEnd?`, `autoRenew`, `lastVerifiedAt`, timestamps. Índice em `status` e
  `currentPeriodEnd` para a reconciliação.
- `SubscriptionEvent` (append-only): auditoria de cada transição vinda de webhook/compra/
  reconciliação — `type`, `payloadResumo`, `createdAt`. Não guardar recibo cru sensível.
- `ParticipationCertificate` (1:1 com `ProfessionalProfile`): `code` (único, aleatório e não
  sequencial), `issuedAt`, `holderNameSnapshot`. A **validade é derivada** do status da
  assinatura no momento da verificação — não guardamos um booleano de validade que possa
  ficar dessincronizado.
- Regra "tem assinatura ativa" é uma função pura de `status ∈ {ACTIVE, IN_GRACE}` e
  `currentPeriodEnd`/`gracePeriodEnd` vs. agora.

### D3 — Gate de entitlement único e reutilizável
Um único helper no servidor `getEntitlement(professionalId | userId)` que retorna
`{ isActive, plan, currentPeriodEnd }`. Consumido por: `proposals` (limite), `search`
(destaque), perfil público (selo) e verificação de certificado. Evita duplicar a regra em
cada módulo (filosofia anti-duplicação do projeto).
- **Destaque na busca:** a busca hoje ordena por colunas reais no Prisma. Para colocar
  assinantes acima sem reescrever a query, buscamos o conjunto (já limitado a 50) e aplicamos
  uma ordenação estável em dois grupos: assinantes ativos primeiro, cada grupo mantendo o
  `orderBy` atual. Um `Set` de ids de profissionais ativos (uma query) resolve. Mantém a
  ordenação existente intacta dentro de cada grupo.
- **Limite de propostas:** em `createProposalHandler`, se não for assinante, contar propostas
  do profissional no mês corrente (`createdAt >= início do mês`) e bloquear ao atingir o teto
  configurável (default 5). Assinante pula a checagem.
- **Selo:** adicionar `isFeatured` na resposta do perfil público **e** da busca.

### D4 — Confiabilidade: webhook + reconciliação
Duas defesas para "app fechado no meio do pagamento" e mudanças fora do app:
1. **Webhook** (`POST /webhooks/revenuecat`, fora do grupo autenticado do app, com validação
   por header secreto): atualiza status na hora.
2. **Reconciliação periódica** (cron no Render ou verificação lazy no acesso): reconfirma
   assinaturas próximas de expirar/`IN_GRACE`. Idempotente — reprocessar um evento não muda o
   resultado. A compra pelo app também reporta ao servidor, então há três caminhos que
   convergem para o mesmo estado.

### D5 — Certificado
Emitido de forma idempotente quando o status vira ativo (no mesmo ponto que aplica a
ativação). `code` gerado com aleatoriedade forte. Página/endpoint público
`GET /certificates/:code` (sem auth, com rate limit por IP no padrão já existente em
`http/rate-limit.ts`) retorna nome, data, validade derivada do status e o aviso de escopo.

### D6 — Config / segredos
Novas envs na API (Render), seguindo `apps/api/src/config/env.ts` (zod, opcionais para não
quebrar o boot local): `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_API_KEY` (para reconciliação
server-side). Chave pública do RevenueCat no app via config Expo. Nada de segredo commitado;
só `.env.example`. Ids de produto das lojas ficam em constantes/config, não hardcoded soltos.

## Risks / Trade-offs

- **Dependência de terceiro (RevenueCat)** → isolamos atrás de `getEntitlement` e do módulo
  `subscriptions`; a fonte de verdade das vantagens é nossa tabela, então trocar o provedor
  no futuro não toca os consumidores.
- **Não testável no Expo Go / difícil no emulador** → IAP exige build EAS e conta sandbox
  (Google testers de licença + Apple Sandbox). Homologação de compra real fica em device com
  build de teste; os fluxos de servidor (entitlement, limite, certificado) são testáveis por
  smoke script como os já existentes em `scripts/`.
- **Quebra de comportamento: limite de propostas** → hoje todos enviam ilimitado; passar a
  limitar não assinantes muda a experiência da APK já instalada no cliente de teste. Avisar
  antes de subir (memória do projeto) e escolher o teto com cuidado; deixar configurável.
- **Reembolso/chargeback** → tratar o evento de reembolso do webhook como perda imediata de
  vantagens para evitar abuso.
- **Ordenação de destaque em dataset maior** → hoje o teto é 50 sem paginação; a ordenação em
  dois grupos é O(n) sobre 50 itens, trivial. Se a busca ganhar paginação depois, mover o
  destaque para a query.

## Migration Plan

1. Migration Prisma criando as três tabelas (nenhuma coluna destrutiva; seguro para rollback
   por não afetar dados existentes).
2. Cadastrar produtos de assinatura nas lojas e no RevenueCat (passo a passo em tasks.md);
   sem isso a compra não funciona em produção, mas a API sobe normal (envs opcionais).
3. Deploy da API com endpoints novos desativados de fato até as envs existirem (webhook só
   responde se o secret estiver setado).
4. App atrás de build EAS; publicar após validar compra em sandbox nas duas lojas.
5. **Rollback:** remover a exigência do limite de propostas e o destaque é reversível por
   flag; a tabela pode permanecer vazia sem efeito. Nenhuma migração de dados a desfazer.

## Decisões confirmadas (respostas do dono do produto)

- **Billing:** RevenueCat (D1).
- **Teto mensal de propostas do não assinante:** 5/mês (configurável no servidor).
- **Grace period:** usar o padrão configurado nas lojas/RevenueCat — não fixar valor próprio.
- **Selo de destaque:** aparece na lista de busca **e** no perfil.

## Open Questions

- Preço dos planos (mensal e anual) — definido no console das lojas; necessário antes de publicar.
