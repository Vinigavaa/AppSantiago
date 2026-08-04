## Why

Ao abrir o teclado virtual, campos de texto e conteúdo abaixo deles ficam escondidos atrás do teclado em várias telas do app. O caso mais grave é a seleção de cidade (`CitySearchPicker`): o bottom sheet tem `maxHeight: 75%` e não reage ao teclado, então o campo de busca e a lista de sugestões ficam total ou parcialmente cobertos — o usuário não vê o que digita nem consegue tocar nas opções.

Já existe um componente `FormScroll` que resolve o problema corretamente, mas ele foi adotado em apenas 6 telas. O restante dos formulários usa `View` puro, `ScrollView` cru ou `KeyboardAvoidingView behavior="padding"` (que no Android duplica o ajuste feito pelo `softwareKeyboardLayoutMode: "resize"` e gera espaço em excesso). O comportamento hoje é inconsistente entre telas e entre plataformas.

## What Changes

- Padronizar o tratamento de teclado em todos os formulários do app em torno do `FormScroll` já existente, eliminando os usos ad-hoc de `KeyboardAvoidingView`/`ScrollView` cru.
- Corrigir o `CitySearchPicker` para que o sheet, o campo de busca e a lista de sugestões permaneçam integralmente acima do teclado, com as sugestões roláveis e tocáveis.
- Aplicar o mesmo padrão nos modais com campos de texto que hoje não tratam teclado ou tratam de forma divergente (`CityMultiSelectModal`, `MultiSelectModal`, `SelectField`, `SearchBar`, `ReviewModal`, `ProposalFormModal`, `PortfolioItemModal`, `CancelServiceModal`, `ChangePasswordModal`, `ClientPersonalInfoModal`, `DeleteAccountModal`, `PersonalInfoModal`).
- Revisar o `ChatScreen`, cujo `KeyboardAvoidingView behavior="padding"` conflita com o `resize` do Android, mantendo a barra de mensagem colada ao teclado sem gerar espaço duplicado.
- Cobrir os formulários que hoje não têm nenhum tratamento: `RequestForm` (categoria, valor, endereço, CEP, telefone, descrição) e demais telas de perfil.
- Documentar o padrão para que novos formulários nasçam corretos, evitando reincidência.

Sem mudanças de API, banco ou backend. Nenhuma mudança quebra a APK já instalada pelo cliente (alterações são apenas de layout no app).

## Capabilities

### New Capabilities
- `formularios-teclado`: comportamento esperado de qualquer tela ou modal com campos de texto quando o teclado virtual abre e fecha — visibilidade do campo focado, visibilidade de listas de sugestão, rolagem, dispensa do teclado e ausência de espaços/quebras de layout, de forma consistente em Android e iOS.

### Modified Capabilities
<!-- Nenhuma: não existem specs em openspec/specs/ ainda. -->

## Impact

- **Componente base**: `src/components/ui/FormScroll.tsx` (possível extensão para uso dentro de modais/sheets).
- **Telas de auth**: `src/app/(auth)/login.tsx`, `register.tsx`, `reset-password.tsx`, `forgot-password.tsx`.
- **Solicitações**: `src/features/service-requests/components/RequestForm.tsx`, `CitySearchPicker.tsx`, `SelectField.tsx`, `ReviewModal.tsx`, `src/features/service-requests/EditRequestScreen.tsx`, `src/app/(private)/new-request.tsx`.
- **Profissional**: `CityMultiSelectModal.tsx`, `MultiSelectModal.tsx`, `PersonalInfoModal.tsx`, `PortfolioItemModal.tsx`, `ProposalFormModal.tsx`.
- **Cliente**: `SearchBar.tsx`, `ChangePasswordModal.tsx`, `ClientPersonalInfoModal.tsx`, `DeleteAccountModal.tsx`.
- **Contratos/Chat**: `CancelServiceModal.tsx`, `src/features/chat/ChatScreen.tsx`, `MessageInput.tsx`.
- **Configuração**: `app.json` (`android.softwareKeyboardLayoutMode: "resize"` já definido — manter e passar a depender dele de forma explícita).
- **Dependências**: nenhuma nova. Solução usando apenas APIs do React Native já presentes.
- **Homologação**: Android Studio e Web.
