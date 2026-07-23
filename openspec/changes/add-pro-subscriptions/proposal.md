## Why

Hoje todo profissional usa o app em pé de igualdade e não há como monetizar. Queremos
uma assinatura paga (apenas para profissionais) que aumente visibilidade e credibilidade
de quem paga, criando a primeira fonte de receita do marketplace. O pagamento precisa
usar a cobrança nativa das lojas (Google Play Billing e Apple StoreKit), porque vender
desbloqueio de funcionalidades digitais dentro do app **obriga** o uso da compra da loja —
não é permitido cobrar cartão por fora para isso.

## What Changes

- Novo fluxo de **assinatura do profissional** com dois planos (mensal e anual), comprados
  pela loja. A compra abre a tela de pagamento nativa; o app nunca coleta cartão.
- **A liberação das vantagens só ocorre após o servidor verificar a compra com a loja**
  (validação de recibo Apple + verificação da compra Google), nunca por confiança no
  dispositivo. O status é reconciliado periodicamente e via webhooks das lojas.
- **Renovação automática, cancelamento (feito na loja) e período de tolerância** (grace
  period) para falha de cobrança, seguindo o comportamento nativo das lojas.
- Botão **"Restaurar compra"** para reconhecer a assinatura em outro aparelho/reinstalação,
  sem cobrar de novo.
- Vantagens liberadas enquanto a assinatura está ativa, todas decididas no servidor:
  1. **Destaque na busca** (assinantes acima dos não assinantes).
  2. **Selo de destaque** no perfil.
  3. **Propostas ilimitadas** (não assinante passa a ter limite mensal — ex.: 3/mês). **BREAKING** (muda o comportamento atual de propostas ilimitadas para todos).
  4. **Certificado de participação** automático, com código único verificável publicamente,
     que deixa explícito ser um selo de participação/verificação na plataforma — **não** uma
     certificação técnica ou profissional oficial. Expira/invalida quando a assinatura cai.

## Capabilities

### New Capabilities
- `professional-subscription`: ciclo de vida da assinatura via IAP — planos, compra,
  verificação server-side com a loja, renovação, cancelamento, grace period, restore e o
  status de assinatura como fonte de verdade no servidor.
- `subscription-entitlements`: as vantagens que a assinatura ativa concede e como são
  aplicadas de forma autoritativa no servidor — destaque na ordenação da busca, selo no
  perfil e limite mensal de propostas para não assinantes vs. ilimitado para assinantes.
- `participation-certificate`: emissão automática do certificado ao ficar ativo, com nome,
  data e código único; verificação pública do código; e invalidação quando a assinatura
  deixa de estar ativa. Deixa claro que é selo de participação, não credencial oficial.

### Modified Capabilities
<!-- Não há specs principais em openspec/specs/ ainda; todas as capacidades acima são novas. -->

## Impact

- **Banco (`packages/database`)**: novas tabelas para assinatura, evento de compra da loja
  e certificado; migration obrigatória. Nova coluna/derivação de "tem assinatura ativa".
- **API (`apps/api`)**: novo módulo `subscriptions` (registrar compra, verificar recibo,
  webhooks Google/Apple, status, restore), gate de entitlements reutilizável, ajuste em
  `proposals` (limite mensal) e em `professional/search` (ordenação por destaque), rota
  pública de verificação de certificado. Novas variáveis de ambiente (chaves das lojas).
- **Mobile (`src/`)**: tela de planos ("Assine e apareça em destaque"), integração com a
  biblioteca de IAP (requer dev client / build EAS — não funciona no Expo Go), botão
  restaurar, selo no perfil, exibição do certificado e do limite de propostas.
- **Dependência externa**: biblioteca de billing das lojas (avaliar RevenueCat vs.
  StoreKit/Play Billing direto) — decisão detalhada no design.
- **Lojas**: cadastro dos produtos de assinatura no Google Play Console e App Store Connect
  (passo a passo no design/tasks) antes de a compra funcionar em produção.
- **APK já instalada no cliente**: a mudança adiciona telas/rotas novas; o limite de
  propostas é uma quebra de comportamento — avaliar impacto na APK de teste antes de subir.
