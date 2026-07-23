## 1. Configuração nas lojas e no RevenueCat (pré-requisito, sem código)

- [ ] 1.1 Google Play Console: em "Monetização > Produtos > Assinaturas", criar a assinatura com dois planos base — mensal e anual (auto-renováveis), definindo `productId`, preços por país, período e desconto do anual. Ativar Real-time Developer Notifications (Pub/Sub) para o app.
- [ ] 1.2 App Store Connect: em "Assinaturas", criar um Subscription Group com dois produtos auto-renováveis (mensal e anual), definindo `Product ID`, duração, preços e a descrição de renovação. Gerar a App Store Connect API Key e configurar App Store Server Notifications V2.
- [ ] 1.3 RevenueCat: criar o projeto, conectar as duas lojas (chaves/credenciais das APIs Apple e Google), mapear os produtos em um único Entitlement "premium" e criar dois Offerings/pacotes (mensal e anual). Anotar a API key pública (app) e configurar o webhook com um secret.
- [ ] 1.4 Registrar em local seguro (não commitar) os identificadores necessários: `productId` de cada plano por loja, App Store Product IDs, RevenueCat public key, `REVENUECAT_API_KEY` e `REVENUECAT_WEBHOOK_SECRET`.
- [ ] 1.5 Preparar contas de teste: licença de teste no Google Play (testers) e usuário Sandbox na Apple, para validar compra sem cobrança real.

## 2. Banco de dados (`packages/database`)

- [x] 2.1 Adicionar enums e modelo `ProfessionalSubscription` (1:1 com `ProfessionalProfile`) com plano, status, store, ids de transação, `currentPeriodEnd`, `gracePeriodEnd?`, `autoRenew`, `lastVerifiedAt` e índices em `status` e `currentPeriodEnd`.
- [x] 2.2 Adicionar modelo `SubscriptionEvent` (append-only) para auditoria de transições, sem armazenar recibo cru sensível.
- [x] 2.3 Adicionar modelo `ParticipationCertificate` (1:1 com `ProfessionalProfile`) com `code` único aleatório, `issuedAt` e `holderNameSnapshot` (validade derivada do status, sem booleano persistido).
- [x] 2.4 Gerar e revisar a migration (`db:migrate:dev`), garantindo que é aditiva e segura para rollback.

## 3. Núcleo de assinatura no servidor (`apps/api/src/modules/subscriptions`)

- [x] 3.1 Criar o módulo `subscriptions` com um serviço de status que expõe o cálculo "assinatura ativa" (status ∈ {ACTIVE, IN_GRACE} e datas vs. agora) a partir da tabela.
- [x] 3.2 Implementar `getEntitlement(userId|professionalId)` reutilizável retornando `{ isActive, plan, currentPeriodEnd }`, como fonte única para os demais módulos.
- [x] 3.3 Adicionar as envs no `config/env.ts` (`REVENUECAT_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`) como opcionais (boot local não quebra) e documentar no `.env.example`.
- [x] 3.4 Implementar a verificação/registro de compra: handler que recebe o resultado da compra do app, confirma o status com o RevenueCat (server-side) e faz upsert da assinatura só se confirmado; nunca ativa por sinal do app.
- [x] 3.5 Implementar `GET /professional/subscription` (status autoritativo: estado, plano, expiração) para o app.
- [x] 3.6 Implementar o "Restaurar compra": handler que reconfirma com o RevenueCat/loja a assinatura do usuário e reativa o registro sem nova cobrança; responder "nada a restaurar" quando não houver.

## 4. Webhooks e reconciliação

- [x] 4.1 Implementar `POST /webhooks/revenuecat` FORA do grupo autenticado do app, validando o secret do header; ignorar requisições que falham na validação.
- [x] 4.2 Mapear os eventos (compra inicial, renovação, cancelamento, entrada em grace period, expiração, reembolso) para transições de status idempotentes, registrando em `SubscriptionEvent`. (Abordagem: cada evento dispara reconsulta ao RevenueCat e persiste o estado real — o payload nunca é a fonte.)
- [x] 4.3 Tratar reembolso/chargeback como perda imediata das vantagens. (Sem entitlement ativo na loja → status EXPIRED.)
- [x] 4.4 Implementar reconciliação periódica (cron no Render ou verificação lazy) que reconfirma assinaturas próximas de expirar/`IN_GRACE` com o RevenueCat, cobrindo o caso de app fechado no meio do pagamento. (`scripts/reconcile-subscriptions.ts` + `npm run subs:reconcile`.)

## 5. Vantagens (entitlements) no servidor

- [x] 5.1 Propostas: em `createProposalHandler`, quando não for assinante, contar propostas do mês corrente do profissional e bloquear ao atingir o teto configurável (default 5), com mensagem clara; assinante pula a checagem.
- [x] 5.2 Tornar o teto mensal configurável no servidor (constante/env, default 5), não hardcoded solto.
- [x] 5.3 Busca: em `searchProfessionalsHandler`, carregar o conjunto de ids de assinantes ativos (uma query) e reordenar em dois grupos — assinantes primeiro — preservando o `orderBy` atual dentro de cada grupo.
- [x] 5.4 Selo: incluir `isFeatured` tanto na resposta do perfil público quanto na resposta da busca do profissional.
- [x] 5.5 Registrar as rotas novas em `modules/app-routes.ts` e ajustar rate limit onde fizer sentido.

## 6. Certificado de participação

- [x] 6.1 Emitir o certificado de forma idempotente no ponto de ativação da assinatura (código aleatório forte, `issuedAt`, snapshot do nome); reativação não duplica.
- [x] 6.2 Implementar `GET /certificates/:code` público (sem auth, com rate limit por IP) retornando nome, data, validade derivada do status atual e o aviso de escopo; "não encontrado" para código inexistente.
- [x] 6.3 Garantir que a verificação responde "inválido" quando a assinatura não está ativa e volta a "válido" ao reativar. (Validade sempre derivada do entitlement em `verifyCertificate`.)

## 7. Mobile (`src/`)

- [x] 7.1 Adicionar `react-native-purchases` (instalado via `expo install`) e configurar a chave pública do RevenueCat via env pública (`EXPO_PUBLIC_REVENUECAT_*`). Obs.: o SDK usa autolinking; não requer config plugin no `app.json`. Build EAS (não Expo Go).
- [x] 7.2 Criar a feature de assinatura em `src/features/subscription` com a tela "Assine e apareça em destaque": lista os dois planos com preços vindos da loja e o texto obrigatório de assinatura auto-renovável (renova até cancelar) com links de Termos e Privacidade.
- [x] 7.3 Fluxo de compra: iniciar a compra pela loja, ao concluir reportar ao servidor (`sync`) e liberar as vantagens só após o servidor confirmar; tratar cancelamento pelo usuário e erros.
- [x] 7.4 Botão "Restaurar compra" na tela de assinatura chamando o fluxo de restore (obrigatório na Apple).
- [x] 7.5 Exibir o status da assinatura (ativa/tolerância/cancelada) e o botão "Gerenciar assinatura na loja" (cancelamento sempre pela loja).
- [x] 7.6 Perfil do profissional: entrada "Assine e apareça em destaque" + certificado exibido na tela de assinatura. Busca e perfil público já recebem `isFeatured` do servidor para o selo.
- [x] 7.7 Propostas: mensagem do limite mensal para não assinantes (vinda do servidor) + CTA "Assinar e enviar sem limite" no modal quando o limite é atingido.

## 8. Homologação e verificação

- [x] 8.1 Smoke script no padrão de `scripts/` cobrindo servidor: vigência, entitlement, destaque (lote de assinantes) e emissão/invalidação/revalidação do certificado. (`scripts/subscriptions-smoke.ts` + `npm run subs:smoke`.) Rodar contra o banco de DEV (cria/apaga um usuário descartável) — não rodar em produção.
- [ ] 8.2 Testar compra real em sandbox nas duas lojas (Android e iOS) via build EAS: compra libera vantagens só após confirmação, restore em reinstalação, cancelamento mantém até expirar, grace period. **(Manual — exige aparelho + build EAS + Grupo 1 concluído.)**
- [ ] 8.3 Confirmar que fechar o app no meio do pagamento ainda resulta em ativação via webhook/reconciliação. **(Manual — depende do Grupo 1 e do webhook configurado no RevenueCat.)**
- [x] 8.4 Revisar checklist final (código morto, duplicação, erros tratados, backend independente do mobile). Typecheck da API e do mobile passam. **Atenção:** o limite de propostas é quebra de comportamento para a APK já instalada — ver aviso no resumo antes de subir para `main`.
