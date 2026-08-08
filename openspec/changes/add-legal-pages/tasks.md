## 1. Estrutura do módulo

- [x] 1.1 Criar `apps/api/src/http/legal-pages.ts` exportando `export const legalPages = new Hono()`
- [x] 1.2 Definir no topo do módulo as constantes `CONTROLLER` (nome e email de contato) e `LAST_UPDATED` (data literal, nunca `new Date()`)
- [x] 1.3 Implementar `escapeHtml` e o helper `renderDocument({ title, lastUpdated, sections })` para documento longo: viewport responsivo, largura de leitura limitada (~720px), tipografia legível a 375px, zero recurso externo
- [x] 1.4 Definir o tipo `Section = { heading: string; paragraphs: string[]; bullets?: string[] }` usado pelos dois documentos

## 2. Termos de Uso

- [x] 2.1 Redigir as seções: natureza do serviço como marketplace que apenas conecta clientes e profissionais
- [x] 2.2 Redigir que o contrato do serviço é entre cliente e profissional, e que a plataforma não executa os serviços
- [x] 2.3 Redigir a seção de assinatura do profissional: renovação automática até cancelamento, cobrança pela Apple ou Google, cancelamento pela própria loja, vantagens até o fim do período pago
- [x] 2.4 Redigir regras de conduta e hipóteses de suspensão ou encerramento de conta
- [x] 2.5 Redigir limitação de responsabilidade, alterações dos termos e foro
- [x] 2.6 Registrar a rota `GET /termos` retornando `renderDocument` com título "Termos de Uso" e a data de atualização visível

## 3. Política de Privacidade

- [x] 3.1 Conferir `packages/database/prisma/schema.prisma` e listar os dados pessoais realmente armazenados antes de escrever a seção de coleta
- [x] 3.2 Redigir identificação do controlador (pessoa física: nome e email de contato, vindos de `CONTROLLER`)
- [x] 3.3 Redigir os dados coletados: nome, email, telefone, foto de perfil, CPF/CNPJ quando informado, endereço do pedido, fotos de pedidos, mensagens e anexos do chat, avaliações, token de push, IP e user-agent da sessão
- [x] 3.4 Redigir finalidade e base legal de cada uso (execução de contrato, legítimo interesse, obrigação legal)
- [x] 3.5 Redigir compartilhamento com operadores: Render (hospedagem), PostgreSQL gerenciado, Resend (email), Cloudinary (imagens), Expo (push), RevenueCat e as lojas Apple/Google (assinaturas)
- [x] 3.6 Redigir os direitos do titular pela LGPD, o canal para exercê-los e o prazo de resposta
- [x] 3.7 Redigir retenção de dados e o procedimento de exclusão de conta
- [x] 3.8 Registrar a rota `GET /privacidade` retornando `renderDocument` com título "Política de Privacidade" e a data de atualização visível

## 4. Índice e montagem

- [x] 4.1 Registrar `GET /legal` com links para `/termos` e `/privacidade`
- [x] 4.2 Montar `app.route("/", legalPages)` em `apps/api/src/http/app.ts`, junto de `landingPages`
- [x] 4.3 Confirmar que `SubscriptionScreen.tsx` continua com os padrões `.../termos` e `.../privacidade` — não alterar

## 5. Verificação

- [x] 5.1 Subir a API local e confirmar `200` em HTML para `/termos`, `/privacidade` e `/legal`, sem cookie e sem `Authorization`
- [x] 5.2 Confirmar que nenhuma das três respostas é o JSON `{"code":"NOT_FOUND"}`
- [x] 5.3 Abrir as páginas em viewport de 375px e confirmar legibilidade sem rolagem horizontal
- [x] 5.4 Inspecionar o HTML e confirmar ausência de script, estilo, fonte ou imagem de outro host
- [x] 5.5 Reler a Política contra o schema: nenhum dado listado que não existe, nenhum dado pessoal armazenado que ficou de fora
- [x] 5.6 Rodar type-check da API e do app (o projeto não tem script de lint configurado)

## 6. Publicação

- [x] 6.1 Preencher `CONTROLLER` com o nome completo e o email de contato reais — Rodrigo Santiago / maosaobra@suporte.com.br
- [x] 6.2 Push para `main` e confirmar as três URLs em produção — commit d5fa251, as três respondem 200 em HTML
- [ ] 6.3 Abrir a tela de assinatura em um build já publicado e confirmar que os dois links abrem conteúdo válido
- [ ] 6.4 Cadastrar a URL de privacidade na ficha da Play Store e as duas URLs no App Store Connect (ação manual, fora do código)
