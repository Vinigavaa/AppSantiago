## Context

O app não tem nenhuma camada de máscara hoje. Cada tela usa `TextInput` cru com um
`maxLength` numérico escolhido caso a caso:

| Campo | Arquivo | Hoje |
|---|---|---|
| CEP | `RequestForm.tsx:135` | `maxLength={9}`, sem máscara |
| Telefone (profissional) | `PersonalInfoModal.tsx:146` | `maxLength={20}`, sem máscara |
| Telefone (cliente) | `ClientPersonalInfoModal.tsx:104` | `maxLength={20}`, sem máscara |
| Valor da proposta | `ProposalFormModal.tsx:120` | `maxLength={12}`, sem máscara |

O `maxLength` do React Native já impede digitar além de N caracteres, mas conta
caracteres, não dígitos — e sem máscara o formato final fica livre. O CEP só é
validado no submit (`useCreateRequestForm.ts:119`) e no backend
(`service-requests/schemas.ts:22`).

Restrição importante: a APK já instalada pelo cliente precisa continuar funcionando.
Como esta mudança é 100% de UI e os payloads permanecem no mesmo formato aceito pelo
backend, não há impacto de compatibilidade.

## Goals / Non-Goals

**Goals:**
- Um único módulo de funções puras de máscara, reutilizado por todas as telas.
- Formatação e truncamento na mesma operação, aplicados no `onChangeText`.
- Comportamento idêntico para digitar e colar, sem código extra.
- Manter as validações existentes (submit + backend) intactas.

**Non-Goals:**
- Não adicionar biblioteca de máscara de terceiros.
- Não criar um componente `MaskedInput` genérico com props de configuração — seria
  abstração precoce para 3 formatos.
- Não alterar o backend nem o schema do banco.
- Não mascarar campos de texto livre (nome, bio, descrição, mensagem): eles já têm
  `maxLength` adequado e não possuem formato.

## Decisions

### 1. Funções puras em `src/lib/masks.ts`, não um componente

Cada máscara é uma função `(raw: string) => string` que recebe o texto do
`onChangeText` e devolve o valor já formatado e truncado:

```ts
export function maskCep(value: string): string
export function maskPhone(value: string): string
export function maskCurrency(value: string): string
```

O uso na tela fica explícito e legível:

```tsx
onChangeText={(value) => onChange("zipCode", maskCep(value))}
```

**Alternativa descartada**: componente `<MaskedInput mask="cep" />`. Adicionaria uma
camada entre a tela e o `TextInput`, escondendo props (`ref`, `returnKeyType`,
`submitBehavior`) que os formulários já usam para encadear foco. Função pura é mais
simples de ler, testar e depurar.

### 2. Truncamento vem de graça pelo `slice` nos dígitos

Todas as máscaras começam extraindo dígitos e cortando no limite:

```ts
const digits = value.replace(/\D/g, "").slice(0, 8)
```

Isso resolve os três casos exigidos com um único mecanismo:
- digitar além do limite → o dígito extra é cortado, o valor não muda, a UI não pisca;
- colar texto longo → só os primeiros N dígitos sobrevivem;
- caractere inválido → some no `replace`.

Não é preciso comparar comprimento anterior nem interceptar `onKeyPress`.

### 3. Telefone decide o formato pela quantidade de dígitos

`maskPhone` não pergunta se é fixo ou celular: com ≤ 10 dígitos usa `(00) 0000-0000`,
com 11 usa `(00) 00000-0000`. Isso torna a transição fixo→celular automática enquanto
o usuário digita, sem seletor de tipo.

**Alternativa descartada**: detectar celular pelo nono dígito ser `9`. Falha para
números fixos que começam com 9 em algumas regiões e cria formatação instável.

### 4. `maxLength` permanece no `TextInput`, alinhado ao valor mascarado

O `maxLength` deixa de ser um número arbitrário e passa a refletir o tamanho da máscara
formatada: `9` para CEP (`00000-000`), `15` para telefone (`(00) 00000-0000`), `10` para
valor. Ele vira uma segunda barreira coerente, não a barreira principal — a máscara é.

### 5. Sem alteração no envio ao backend

`useCreateRequestForm` já usa a regex `/^\d{5}-?\d{3}$/`, que aceita o CEP mascarado.
O telefone mascarado tem 15 caracteres, dentro do `max(20)` do backend. Nenhuma
normalização nova é necessária — o handler da API já chama `normalizeZipCode`.

## Risks / Trade-offs

- **Valores já salvos fora do formato** (telefones antigos digitados livremente) →
  ao abrir o modal, o valor vindo da API passa pela máscara no estado inicial, então
  é normalizado na primeira edição. Valores nunca reeditados permanecem como estão,
  o que é aceitável: o backend não depende do formato.

- **Cursor "pulando" ao editar no meio do texto** → limitação conhecida de máscaras
  controladas em React Native. Como todos os campos afetados são curtos e numéricos,
  o padrão de uso real é digitar do início ao fim. Não vale a complexidade de
  gerenciar `selection` manualmente.

- **Máscara no cliente não substitui validação** → a validação de submit e as regras
  do backend continuam existindo e são a fonte da verdade, conforme o CLAUDE.md.
