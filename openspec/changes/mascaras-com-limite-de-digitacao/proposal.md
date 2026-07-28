## Why

Hoje os campos de CEP, telefone e valor no app aceitam texto livre: não há máscara de
formatação e o único freio é um `maxLength` genérico (`9` no CEP, `20` no telefone,
`12` no valor). O usuário consegue digitar `4899999999999999999`, salvar telefone em
formatos diferentes a cada tela e só descobre que o CEP está errado quando aperta
"Publicar". Isso gera dados inconsistentes no banco e uma experiência de digitação
que não parece profissional.

## What Changes

- Criar utilitários de máscara no mobile (`src/lib/masks.ts`) que formatam **e** truncam
  na mesma operação: CEP, telefone brasileiro (fixo e celular) e valor monetário.
- CEP passa a ser mascarado durante a digitação (`00000-000`) e bloqueia qualquer
  caractere após os 8 dígitos.
- Telefone passa a ser mascarado dinamicamente: `(00) 0000-0000` até 10 dígitos e
  `(00) 00000-0000` ao atingir 11 dígitos; nada é aceito além do 11º dígito.
- Valor da proposta passa a aceitar apenas dígitos e um separador decimal, com teto
  de casas definido, descartando o excedente.
- Colar texto maior que o limite passa a truncar automaticamente em vez de rejeitar
  ou aceitar o excesso — consequência natural de mascarar no `onChangeText`.
- Campos de texto livre (nome, descrição, bio, mensagem) mantêm o `maxLength` atual;
  a mudança apenas garante que todo campo com formato conhecido tenha máscara + limite
  coerentes.
- Sem mudança de API: o backend continua recebendo e validando os mesmos formatos
  (`/^\d{5}-?\d{3}$/` no CEP, `max(20)` no telefone). A máscara só garante que o
  mobile nunca envie algo fora do formato.

## Capabilities

### New Capabilities
- `input-masking`: comportamento de formatação e limite de digitação dos campos do app
  (CEP, telefone, valor e demais campos com tamanho máximo definido).

### Modified Capabilities
<!-- Nenhuma. Não há specs existentes em openspec/specs/ e nenhum requisito de
     backend muda: as regras de validação da API permanecem idênticas. -->

## Impact

- **Novo**: `src/lib/masks.ts` (funções puras de máscara).
- **Alterado**:
  - `src/features/service-requests/components/RequestForm.tsx` (CEP)
  - `src/features/professional/components/PersonalInfoModal.tsx` (telefone)
  - `src/features/client-home/components/ClientPersonalInfoModal.tsx` (telefone)
  - `src/features/professional/components/ProposalFormModal.tsx` (valor)
  - `src/features/service-requests/useCreateRequestForm.ts` (normalização do CEP no envio)
- **Backend**: nenhuma alteração. As validações da API continuam sendo a fonte da verdade.
- **Compatibilidade com a APK instalada**: nenhuma quebra — mudança puramente de UI,
  os payloads enviados continuam no mesmo formato aceito hoje.
