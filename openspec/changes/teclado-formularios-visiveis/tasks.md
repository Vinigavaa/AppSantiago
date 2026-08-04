## 1. Base reutilizável

- [x] 1.1 Criar `src/lib/useKeyboardHeight.ts` com listeners por plataforma (`keyboardWillShow/Hide` no iOS, `keyboardDidShow/Hide` no Android), devolvendo a altura atual do teclado e 0 quando fechado, com remoção dos listeners no unmount
- [x] 1.2 Criar `src/components/ui/FormSheet.tsx`: backdrop, container do bottom sheet, `paddingBottom` igual à altura do teclado e `maxHeight` = 75% da tela menos a altura do teclado
- [x] 1.3 Revisar `src/components/ui/FormScroll.tsx` e atualizar o comentário do topo para refletir o padrão final (telas → `FormScroll`, sheets → `FormSheet`)

## 2. Seleção de cidade (caso crítico)

- [x] 2.1 Migrar `src/features/service-requests/components/CitySearchPicker.tsx` para `FormSheet`, removendo o `maxHeight: "75%"` fixo do estilo `sheet`
- [x] 2.2 Garantir que a `FlatList` de sugestões ocupe o espaço restante do sheet (`flex: 1`) e role, mantendo `keyboardShouldPersistTaps="handled"`
- [ ] 2.3 Validar no Android Studio: digitar, ver campo + sugestões acima do teclado, selecionar uma cidade no primeiro toque, fechar o teclado sem espaço residual

## 3. Demais sheets de seleção

- [x] 3.1 Migrar `src/features/professional/components/CityMultiSelectModal.tsx` para `FormSheet`
- [x] 3.2 Migrar `src/features/professional/components/MultiSelectModal.tsx` para `FormSheet`
- [x] 3.3 Migrar `src/features/service-requests/components/SelectField.tsx` para `FormSheet` (categorias)
- [x] 3.4 Ajustar `src/features/client-home/components/SearchBar.tsx` para que o campo de busca e os resultados fiquem acima do teclado

## 4. Modais de formulário (remoção do KeyboardAvoidingView)

- [x] 4.1 `src/features/professional/components/PersonalInfoModal.tsx`: trocar `KeyboardAvoidingView` + `ScrollView` por `FormScroll`
- [x] 4.2 `src/features/professional/components/PortfolioItemModal.tsx`: mesma troca
- [x] 4.3 `src/features/professional/components/ProposalFormModal.tsx`: mesma troca (valores)
- [x] 4.4 `src/features/client-home/components/ClientPersonalInfoModal.tsx`: mesma troca
- [x] 4.5 `src/features/client-home/components/ChangePasswordModal.tsx`: mesma troca
- [x] 4.6 `src/features/client-home/components/DeleteAccountModal.tsx`: mesma troca
- [x] 4.7 `src/features/contracts/CancelServiceModal.tsx`: mesma troca
- [x] 4.8 `src/features/service-requests/components/ReviewModal.tsx`: mesma troca (formulário de avaliação)

## 5. Telas de formulário

- [x] 5.1 Confirmar que `login.tsx`, `register.tsx`, `forgot-password.tsx` e `reset-password.tsx` usam `FormScroll` com `contentContainerStyle` que permita rolagem completa até o botão de envio
- [x] 5.2 Revisar `src/features/service-requests/components/RequestForm.tsx` (endereço, CEP, telefone, valor, descrição) dentro de `new-request.tsx` e `EditRequestScreen.tsx`, garantindo que todos os campos rolem para acima do teclado
- [x] 5.3 Varrer `src/app` e `src/features` por telas com `TextInput` fora de `FormScroll`/`FormSheet` e corrigir as que restarem

## 6. Chat

- [x] 6.1 Substituir o `KeyboardAvoidingView behavior="padding"` de `src/features/chat/ChatScreen.tsx` por deslocamento da barra de mensagem via `useKeyboardHeight`
- [ ] 6.2 Validar que a lista invertida não é redimensionada duas vezes no Android e que a última mensagem permanece visível com o teclado aberto

## 7. Limpeza e documentação

- [x] 7.1 Confirmar por busca no código que não restam usos de `KeyboardAvoidingView` nem `ScrollView` cru em formulários, e remover imports/estilos que ficaram sem uso
- [x] 7.2 Adicionar entrada curta em `CLAUDE.md` (seção "Armadilhas Conhecidas (Mobile)") descrevendo o padrão: telas → `FormScroll`, sheets/modais com campo → `FormSheet`/`useKeyboardHeight`, nunca `KeyboardAvoidingView`
- [x] 7.3 Rodar lint e type-check do projeto (type-check OK; o projeto não tem config de ESLint — não há lint para rodar)

## 8. Homologação

- [ ] 8.1 Android Studio: percorrer cadastro, login, perfil do cliente, perfil do profissional, criação e edição de solicitação, cidade, categorias, valores, endereço, CEP, telefone, descrição, chat, busca e avaliação, verificando campo focado visível, ausência de espaço excessivo e cabeçalhos preservados
- [ ] 8.2 Web: confirmar que nenhuma tela regrediu visualmente
- [ ] 8.3 Rodar `graphify update .` após as alterações (CLI não instalada nesta máquina — `graphify` e `npx graphify` não resolvem)
