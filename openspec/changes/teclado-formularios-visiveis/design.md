## Context

O app já tem `app.json` com `android.softwareKeyboardLayoutMode: "resize"` e um componente `src/components/ui/FormScroll.tsx` que combina `automaticallyAdjustKeyboardInsets` (iOS), `keyboardDismissMode="on-drag"` e `keyboardShouldPersistTaps="handled"`. Essa combinação resolve o problema em telas normais, mas foi adotada em apenas 6 arquivos.

Estado atual, levantado por varredura em `src/`:

| Padrão encontrado | Onde | Problema |
| --- | --- | --- |
| `FormScroll` | login, register, forgot/reset-password, new-request, EditRequestScreen | correto |
| `KeyboardAvoidingView behavior="padding"` + `ScrollView` | PersonalInfoModal, ChangePasswordModal, ClientPersonalInfoModal, DeleteAccountModal, PortfolioItemModal, ProposalFormModal, ReviewModal, CancelServiceModal | no Android soma padding ao `resize` → espaço excessivo; `behavior` fixo ignora a diferença iOS/Android |
| `KeyboardAvoidingView behavior="padding"` sem scroll | ChatScreen | barra de mensagem descolada/duplicada no Android |
| Nenhum tratamento | CitySearchPicker, CityMultiSelectModal, MultiSelectModal, SelectField, SearchBar, RequestForm (campos dentro de tela já com FormScroll, mas sheets internos não) | campo e lista cobertos pelo teclado |

O caso da cidade tem uma causa adicional: o conteúdo vive dentro de um `<Modal>` do React Native. No Android o `<Modal>` abre em uma janela própria, que não herda de forma confiável o `adjustResize` da activity; e o sheet usa `maxHeight: "75%"` calculado sobre a altura total da tela, ignorando o teclado. Por isso um `FormScroll` sozinho não resolve sheets.

## Goals / Non-Goals

**Goals:**
- Um único padrão de área de formulário, reutilizável, para telas e para sheets/modais.
- Campo focado e lista de sugestões sempre visíveis acima do teclado, em Android e iOS.
- Remover tratamentos ad-hoc e divergentes de teclado do código.
- Documentar o padrão para novos formulários.

**Non-Goals:**
- Introduzir nova dependência (ex.: `react-native-keyboard-controller`). O ganho não justifica o custo de build/binário nesta fase.
- Redesenhar formulários ou mudar validações, campos ou fluxos.
- Mudanças no backend.

## Decisions

### 1. `FormScroll` como único mecanismo para telas

Manter e padronizar `FormScroll`. Ele já usa o mecanismo nativo certo de cada plataforma: `automaticallyAdjustKeyboardInsets` no iOS e o `resize` da janela no Android. Todas as telas com campos passam a usá-lo; nenhum `KeyboardAvoidingView` permanece em telas.

*Alternativa considerada:* manter `KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}`. Rejeitada: é exatamente o que `automaticallyAdjustKeyboardInsets` faz melhor no iOS (rola até o campo focado, não só empurra), e mantém dois padrões no código.

### 2. Hook `useKeyboardHeight` para sheets e modais

Criar `src/lib/useKeyboardHeight.ts`: listeners de `keyboardWillShow`/`keyboardWillHide` no iOS e `keyboardDidShow`/`keyboardDidHide` no Android, devolvendo a altura atual do teclado (0 quando fechado). Sheets aplicam essa altura como `paddingBottom` e a descontam do `maxHeight`.

Motivo: dentro de `<Modal>` não dá para confiar no ajuste automático da janela no Android. Um valor explícito de altura é previsível, funciona igual nas duas plataformas e é trivial de depurar.

*Alternativa considerada:* trocar `<Modal>` por um overlay absoluto na própria árvore da tela. Rejeitada: mexe na navegação e no comportamento do botão voltar de vários componentes — mudança grande demais para o ganho.

### 3. Componente `FormSheet` para bottom sheets com campo de texto

Criar `src/components/ui/FormSheet.tsx`, que encapsula: backdrop, container do sheet, `paddingBottom` = altura do teclado e `maxHeight` = 75% da tela menos a altura do teclado. `CitySearchPicker`, `CityMultiSelectModal`, `MultiSelectModal` e `SelectField` passam a usá-lo.

Consequência para a cidade: com o sheet encolhido acima do teclado, a `FlatList` de sugestões ocupa o espaço restante e rola normalmente. O `keyboardShouldPersistTaps="handled"` que já existe garante seleção no primeiro toque.

### 4. Modais de formulário usam `FormScroll` dentro do `<Modal>`

Os modais que hoje usam `KeyboardAvoidingView` + `ScrollView` trocam ambos por `FormScroll`, com `paddingBottom` vindo de `useKeyboardHeight` no container quando o modal for `presentationStyle` padrão. Isso remove o padding duplicado no Android.

### 5. Chat mantém tratamento próprio, corrigido

`ChatScreen` não é um formulário rolável: é uma lista invertida com uma barra fixa. Ele mantém um tratamento dedicado, usando `useKeyboardHeight` para deslocar apenas a barra de mensagem, em vez de `KeyboardAvoidingView behavior="padding"`. Assim a lista não é redimensionada duas vezes no Android.

### 6. Documentação do padrão

Adicionar ao `CLAUDE.md`, na seção "Armadilhas Conhecidas (Mobile)", uma entrada curta: telas → `FormScroll`; sheets/modais com campo → `FormSheet`/`useKeyboardHeight`; nunca `KeyboardAvoidingView`.

## Risks / Trade-offs

- **Altura do teclado no Android com barra de navegação por gestos pode incluir/excluir insets inesperados** → aplicar a altura relativa à área segura já usada pelo sheet e validar no Android Studio com gestos e com botões.
- **`keyboardWillShow` não existe no Android** → o hook seleciona o evento por plataforma; no Android o ajuste ocorre em `keyboardDidShow`, com transição levemente menos suave. Aceitável.
- **Regressão visual em modais que hoje "funcionam por acaso"** → revisar cada modal individualmente durante a implementação, não em lote.
- **Teclados de terceiros (GBoard com barra de sugestão, teclados flutuantes) reportam alturas variáveis** → o hook lê a altura de cada evento em vez de cachear, então acompanha mudanças.
- **Web (homologação)** → os eventos de teclado do RN não disparam na web; o layout permanece o atual, sem regressão.

## Migration Plan

Mudança puramente de UI no app, sem migração de dados. Implantação por commit único em `main`. Rollback = reverter o commit. Não afeta a APK já instalada pelo cliente, que continua funcionando contra a mesma API.

## Open Questions

- Nenhuma bloqueante. Caso, na validação, a altura de 75% do sheet fique apertada demais em telas pequenas com teclado aberto, ajustar para altura flexível (`flex` com `maxHeight`) durante a implementação.
