## Context

O change `badges-navegacao-notificacoes` já entregou a infraestrutura de que este depende:

- `GET /notifications/badges` com contagem por área, chamado por um poll de 45s.
- `NotificationBadgesProvider` em `src/app/(private)/_layout.tsx`, com revalidação por `AppState` e por push recebido (`usePushReceived`).
- `POST /notifications/read` com `area` opcional; a tela dona de cada aba marca a própria área ao ganhar foco.
- `areas.ts` como fonte única do mapa tipo × perfil → área.

As notificações dos dois eventos deste change já existem no banco e são criadas nos handlers:

- Aceite: `proposals/handlers.ts` cria `PROPOSAL_ACCEPTED` para o profissional.
- Cancelamento pelo profissional: `contracts/handlers.ts` cria `SERVICE_UPDATED` para o cliente.

Ou seja: o dado já existe e já chega ao app. O que falta é apresentá-lo como aviso.

Sobre toasts, o app tem hoje um padrão ad-hoc repetido: `styles.notice` — uma `View` absoluta no topo com ícone e texto — em `ReceivedProposalsScreen`, `ClientProfileScreen`, `ProfessionalProfileScreen`, `SubscriptionScreen` e `MultiSelectModal`. Cinco cópias da mesma ideia, cada uma com o próprio estado.

## Goals / Non-Goals

**Goals:**
- Aviso imediato e não bloqueante para proposta aceita e serviço cancelado.
- Nenhum aviso duplicado para o mesmo evento.
- Evento não visto permanece pendente até a área ser visualizada.
- Corrigir a área de `PROPOSAL_ACCEPTED` do profissional para "Serviços".
- Nenhuma dependência nova e nenhum mecanismo novo de atualização.

**Non-Goals:**
- Realtime (WebSocket/SSE). O poll de 45s + push já existentes bastam.
- Migrar as cinco telas com o padrão `notice` ad-hoc para o `Toast` novo. Fica como limpeza separada, para não inflar este change.
- Toast para mensagens de chat.
- Central de avisos, histórico de toasts ou preferências por tipo.
- Trocar a biblioteca de ícones do app.

## Decisions

### 1. Ionicons, não Lucide

O app usa `@expo/vector-icons` (Ionicons) em 48 arquivos. Adotar Lucide só nesta funcionalidade produziria exatamente a mistura de bibliotecas que o pedido quer evitar, e traria `lucide-react-native` + `react-native-svg` para resolver um problema que a biblioteca atual já resolve.

Equivalências diretas, no mesmo estilo e espessura do resto do app:

| Intenção | Lucide | Ionicons usado |
| --- | --- | --- |
| Proposta aceita | `CheckCircle` | `checkmark-circle` |
| Serviço cancelado | `CircleAlert` | `alert-circle` |
| Nova proposta | `FileText` | `document-text` |
| Nova mensagem | `MessageCircle` | `chatbubble-ellipses` |
| Notificação | `Bell` | `notifications` |

*Alternativa considerada:* migrar os 48 arquivos para Lucide. É um change próprio — grande, arriscado e sem relação com o problema aqui.

### 2. Os eventos vêm no payload de badges, não em um endpoint novo

`GET /notifications/badges` passa a devolver `events`: as notificações não lidas dos tipos de aviso, `take: 5`, ordenadas por `createdAt desc`.

Assim o toast herda de graça toda a entrega já construída: o poll de 45s, a revalidação ao voltar do background e o `refresh()` disparado pelo push. Zero mecanismo novo.

*Alternativa considerada:* `GET /notifications/events`. Seria uma segunda requisição no mesmo ciclo, com a mesma latência e o mesmo dado — sem ganho.

O custo é o endpoint deixar de ser puramente agregado: passa a ter um `findMany` limitado a 5 linhas, sobre `userId` indexado e `readAt = null`. Barato o bastante para o intervalo de 45s.

### 3. Deduplicação por `id` em memória, não em disco

O provider guarda um `Set<string>` com os ids já exibidos. Um evento só vira toast se o id não estiver no conjunto.

Isso resolve os dois casos de duplicidade que importam:
- O mesmo evento reaparecendo em ciclos seguintes do poll enquanto o usuário não abre a aba.
- Push e poll trazendo o evento no mesmo instante.

O conjunto vive na memória do provider. Se o app for reaberto e o evento ainda estiver não lido, o toast aparece de novo — e isso é o comportamento desejado, não um defeito: o requisito diz que a informação deve continuar pendente para ser apresentada quando o usuário voltar.

*Alternativa considerada:* persistir os ids exibidos (SecureStore/AsyncStorage). Adicionaria I/O e um estado a invalidar, para *impedir* justamente o comportamento que o requisito pede.

### 4. Exibir o toast não marca como lido

O toast é reforço, não substituto. Marcar como lido ao exibir faria o indicador da aba sumir sem o usuário ter visto nada — o aviso pode aparecer enquanto ele olha para outro lugar.

A leitura continua acontecendo só quando a tela dona da área ganha foco, via `useMarkAreaRead`, como já está implementado.

### 5. Fila com um toast por vez

`ToastProvider` mantém uma fila e renderiza apenas o primeiro item. Cada toast fica 4s e sai; toque dispensa na hora e adianta o próximo. Nunca há dois na tela.

Com no máximo 5 eventos por ciclo, o pior caso é 20s de avisos em sequência — aceitável e raro. O que sobra continua no indicador da aba, que é o canal persistente.

*Alternativa considerada:* empilhar os toasts. Ocuparia a tela inteira num acúmulo e brigaria com "discreto, sem interromper".

### 6. Onde o provider mora

`ToastProvider` vai em `src/app/_layout.tsx`, acima de tudo — é o único ponto que cobre telas autenticadas, de auth e modais. O `NotificationBadgesProvider` continua no layout privado e consome `useToast()`.

Isso implica que o `ToastProvider` seja puramente visual: fila, timer e render. Quem decide *o que* virou toast é o provider de badges, que já conhece as notificações.

### 7. A mensagem diz onde reencontrar a proposta

Hoje o cancelamento pelo profissional gera: *"O profissional cancelou o serviço. Sua solicitação voltou a ficar aberta para novas propostas."*

Falta o ponteiro. A mensagem passa a citar a aba "Recusadas" — que é o rótulo real em `ProposalTabs` (`{ key: "closed", label: "Recusadas" }`), e onde propostas `REJECTED` e `CANCELED` de fato aparecem.

O texto do pedido menciona "Propostas recusadas/canceladas"; usar o rótulo que está na tela evita mandar o usuário procurar uma aba que não existe com esse nome. Se o rótulo mudar depois, a mensagem muda junto.

Como o toast usa o texto da notificação, a correção serve aos três canais de uma vez: toast, central de notificações e push.

### 8. `PROPOSAL_ACCEPTED` do profissional muda de área

Uma linha em `areas.ts`: `dashboard` → `services`. O `dashboard` segue com o que ainda está em disputa (`PROPOSAL_RECEIVED`, `PROPOSAL_REJECTED`); o que virou contrato aparece em "Serviços".

Essa era a pergunta em aberto deixada no design de `badges-navegacao-notificacoes` — agora respondida.

## Risks / Trade-offs

- **Atraso de até 45s sem push** → o toast é reforço, não canal crítico; o indicador da aba cobre o intervalo. O push cobre o caso urgente.
- **Toast repetido após reabrir o app** → intencional (decisão 3). Só acontece enquanto o evento não foi visualizado.
- **`events` engorda um endpoint de poll** → limitado a 5 linhas, com colunas pequenas e filtro indexado.
- **Toast aparecendo em cima de um modal aberto** → o `ToastProvider` fica na raiz, então renderiza abaixo de um `<Modal>` do React Native. Aceito: o aviso reaparece na sequência do poll enquanto não for exibido, e o indicador da aba nunca depende dele.
- **`SERVICE_UPDATED` é um tipo genérico** → cobre cancelamento pelo profissional, pelo cliente, no-show e reabertura. Todos merecem aviso, e o texto vem da própria notificação, então nenhum caso fica com mensagem errada.
- **Cinco cópias do padrão `notice` continuam no código** → dívida reconhecida e deixada para uma limpeza própria, para este change não virar refatoração de cinco telas.

## Migration Plan

1. Backend: `areas.ts` (uma linha), `events` no handler de badges, texto do cancelamento. Deploy em `main`.
2. Mobile: `Toast.tsx`, provider na raiz, consumo no `badges-context`.
3. Rollback: remover o `ToastProvider` da raiz devolve o app ao comportamento atual; `events` fica sem uso, sem efeito colateral.

## Open Questions

Nenhuma. A pergunta em aberto herdada do change anterior (`SERVICE_UPDATED` do cliente pertencer a `proposals`) fica confirmada: é na aba "Propostas", em "Recusadas", que o cliente reencontra a proposta cancelada.
