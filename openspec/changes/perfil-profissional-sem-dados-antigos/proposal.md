## Why

Ao abrir o perfil de um profissional logo depois de ter visto o perfil de outro, a tela exibe por alguns segundos os dados do profissional anterior (nome, foto, categoria, avaliações) e só então troca pelos dados corretos. O usuário percebe isso como um bug — em casos ruins pode chegar a tocar em "Conversar" ou "Solicitar Serviço" achando que está agindo sobre o profissional que escolheu, quando a tela ainda mostra o anterior.

A causa é que `professional-profile` é uma `Tabs.Screen` (com `href: null`) dentro de `src/app/(private)/_layout.tsx`: a tela é um singleton e **não desmonta** entre navegações. Ao navegar para `?id=B`, a mesma instância de `PublicProfessionalScreen` continua montada com o estado do profissional A, e o guard `isLoading && !professional` mantém o perfil antigo na tela enquanto o fetch de B não retorna.

## What Changes

- A tela de perfil público do profissional passa a tratar cada `id` como um conteúdo distinto: ao mudar o `id`, os dados do profissional anterior são descartados imediatamente.
- Enquanto os dados do profissional selecionado carregam, a tela exibe o estado de carregamento já existente (`LoadingState`) — nunca dados de outro profissional.
- Ações da tela (Conversar, Solicitar Serviço, Bloquear/Desbloquear, avaliações, portfólio) só ficam disponíveis depois que o perfil correto está carregado, o que passa a ser garantia estrutural e não um efeito colateral.
- Sem mudanças de API, banco ou backend. Sem breaking change.

## Capabilities

### New Capabilities
- `professional-public-profile`: comportamento da tela de perfil público do profissional quanto à identidade do conteúdo exibido — qual profissional está na tela, o que aparece durante o carregamento e o que aparece em caso de erro.

### Modified Capabilities
<!-- Nenhuma: não existem specs em openspec/specs/ ainda. -->

## Impact

- `src/app/(private)/professional-profile.tsx` — rota que resolve o parâmetro `id` e monta a tela.
- `src/features/professional/PublicProfessionalScreen.tsx` — estado local de carregamento e do profissional exibido.
- Fluxos de entrada afetados (todos passam a se comportar igual): busca (`ProfessionalSearchScreen`), chat (`ChatScreen`) e propostas recebidas (`ReceivedProposalsScreen`).
- Sem impacto em `apps/api`, schema do banco, ou dependências.

### Observação fora de escopo

Outras telas param-driven declaradas como `Tabs.Screen` no mesmo layout (`chat`, `request-details`, `opportunity-details`, `edit-request`) têm potencialmente o mesmo padrão de singleton. Esta change corrige apenas o perfil do profissional, que é o problema relatado; a auditoria das demais fica como acompanhamento separado.
