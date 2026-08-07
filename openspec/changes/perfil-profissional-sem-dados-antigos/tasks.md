## 1. Implementação

- [x] 1.1 Em `src/app/(private)/professional-profile.tsx`, montar a feature com `key={id}` (`<PublicProfessionalScreen key={id} id={id} />`), para que a troca de `id` remonte a tela com estado inicial.
- [x] 1.2 No mesmo arquivo, adicionar um comentário curto explicando que a tela é uma `Tabs.Screen` singleton e que o `key` existe para não reaproveitar o estado do profissional anterior.
- [x] 1.3 Revisar `src/features/professional/PublicProfessionalScreen.tsx` e confirmar que nenhum código extra é necessário — o guard `isLoading && !professional`, o estado de erro e o "Tentar novamente" já cobrem os requisitos. Não adicionar estado, hook ou componente novo.

## 2. Verificação manual (Android Studio e Web)

- [ ] 2.1 Buscar o profissional A, abrir o perfil, voltar, abrir o perfil do profissional B pela busca: confirmar que só aparece `LoadingState` e depois B, nunca A.
- [ ] 2.2 Repetir o fluxo do relato: abrir o perfil de A pela busca → ir em Mensagens → abrir a conversa com B → abrir o perfil de B pelo cabeçalho do chat. Confirmar que A não aparece em nenhum frame.
- [ ] 2.3 Abrir um perfil pela lista de propostas recebidas (`ReceivedProposalsScreen`) logo após ter visto outro perfil e confirmar o mesmo comportamento.
- [ ] 2.4 Reabrir o mesmo profissional duas vezes seguidas e confirmar que a tela carrega e exibe os dados corretos (sem tela vazia nem travada em carregamento).
- [ ] 2.5 Simular falha de rede ao abrir o segundo perfil e confirmar que aparece a mensagem de erro com "Tentar novamente" — e não os dados do perfil anterior. Confirmar que "Tentar novamente" recarrega o `id` correto.
- [ ] 2.6 Confirmar que bloquear/desbloquear e o botão "Conversar" continuam funcionando no perfil recém-aberto.

## 3. Fechamento

- [x] 3.1 Rodar lint e type-check do projeto e garantir que passam. (`npx tsc --noEmit` passou sem erros; o projeto não tem linter configurado — sem ESLint/Biome/Prettier nas dependências nem arquivo de config.)
- [x] 3.2 Conferir que não sobrou código morto, import não usado ou estado sem uso após a alteração.
- [ ] 3.3 Rodar `graphify update .` para manter o grafo atualizado. (CLI `graphify` não está instalado nesta máquina — comando não encontrado.)
