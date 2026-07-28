## 1. Utilitários de máscara

- [x] 1.1 Criar `src/lib/masks.ts` com `maskCep(value)`: extrai dígitos, corta em 8 e formata como `00000-000` (hífen só a partir do 6º dígito)
- [x] 1.2 Adicionar `maskPhone(value)` no mesmo arquivo: extrai dígitos, corta em 11, formata `(00) 0000-0000` até 10 dígitos e `(00) 00000-0000` com 11
- [x] 1.3 Adicionar `maskCurrency(value)`: mantém apenas dígitos e um separador decimal, limitando a 7 dígitos inteiros e 2 casas decimais
- [x] 1.4 Comentar cada função com o formato resultante e o limite aplicado, no estilo dos demais arquivos de `src/lib`

## 2. Aplicar máscara nos campos

- [x] 2.1 `src/features/service-requests/components/RequestForm.tsx`: aplicar `maskCep` no `onChangeText` do campo CEP e ajustar `maxLength` para 9
- [x] 2.2 `src/features/professional/components/PersonalInfoModal.tsx`: aplicar `maskPhone` no campo telefone e ajustar `maxLength` para 15
- [x] 2.3 `src/features/client-home/components/ClientPersonalInfoModal.tsx`: aplicar `maskPhone` no campo telefone e ajustar `maxLength` para 15
- [x] 2.4 `src/features/professional/components/ProposalFormModal.tsx`: aplicar `maskCurrency` no campo de valor e ajustar `maxLength` para 10
- [x] 2.5 Normalizar o valor inicial vindo da API nos modais de telefone (aplicar `maskPhone` ao popular o estado), para que dados antigos apareçam formatados

## 3. Varredura de campos restantes

- [x] 3.1 Revisar todos os `TextInput` do app e confirmar que cada campo com formato conhecido usa máscara e que os demais têm `maxLength` definido
- [x] 3.2 Adicionar `maxLength` a qualquer campo encontrado sem limite, alinhado ao limite correspondente no backend (`apps/api/src/modules/**/schemas.ts`)

## 4. Verificação

- [x] 4.1 Rodar type-check/lint do projeto e corrigir eventuais erros
- [ ] 4.2 Validar manualmente no Android Studio e na Web: digitar além do limite, colar texto longo e apagar caracteres em CEP, telefone e valor
- [ ] 4.3 Confirmar que criar uma solicitação e enviar uma proposta continuam funcionando com os valores mascarados (backend aceita o payload)
