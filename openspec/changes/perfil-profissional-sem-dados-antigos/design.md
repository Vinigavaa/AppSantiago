## Context

`src/app/(private)/professional-profile.tsx` é declarada como `Tabs.Screen name="professional-profile"` (com `href: null`) nos dois layouts de `src/app/(private)/_layout.tsx`. Telas de um navigator de abas são **singletons**: ao navegar de `?id=A` para `?id=B`, o React Navigation reaproveita a mesma instância montada e apenas troca os params. Nenhum componente desmonta.

`PublicProfessionalScreen` guarda o profissional em estado local:

```tsx
const [professional, setProfessional] = useState<PublicProfessional | null>(null)
const [isLoading, setIsLoading] = useState(true)
// ...
if (isLoading && !professional) return <LoadingState />
```

Como a instância não desmonta, `professional` ainda contém A quando `id` vira B. O `useEffect`/`load` dispara corretamente para B, mas o guard `isLoading && !professional` é falso (há um profissional em memória), então a tela renderiza A até a resposta de B chegar — os ~3 segundos relatados. O tempo é o da requisição à API, não um atraso artificial.

O mesmo mecanismo torna possível uma inconsistência secundária: `id` mudar duas vezes em sequência rápida faz duas requisições sem garantia de ordem de chegada, e a última resposta a resolver vence.

## Goals / Non-Goals

**Goals:**

- A tela nunca mostrar dados de um profissional diferente do `id` da navegação atual.
- Estado de carregamento visível enquanto o perfil correto não chegou.
- Solução mínima, sem nova dependência e sem camada de cache.

**Non-Goals:**

- Corrigir as demais telas param-driven do mesmo layout (`chat`, `request-details`, `opportunity-details`, `edit-request`) — mesma classe de problema, acompanhamento separado.
- Introduzir biblioteca de data fetching (react-query ou similar) ou cache de perfis.
- Mudar a arquitetura de navegação (converter as telas param-driven em Stack).
- Qualquer alteração em `apps/api`.

## Decisions

### Decisão 1: remontar a tela por `id` usando `key`

Em `professional-profile.tsx`, montar a feature com `key={id}`:

```tsx
return <PublicProfessionalScreen key={id} id={id} />
```

O React trata `key` diferente como um componente distinto: desmonta a instância antiga e monta uma nova com estado inicial (`professional: null`, `isLoading: true`). O guard existente `isLoading && !professional` volta a funcionar exatamente como foi escrito, e o `LoadingState` aparece.

Efeito colateral desejável: a resposta de uma requisição de um `id` antigo cai em uma instância desmontada, então não pode sobrescrever a tela atual — a corrida de respostas fora de ordem deixa de existir sem precisar de `AbortController` ou de checagem de "id ainda é o atual".

**Alternativas consideradas:**

- *Resetar o estado dentro de `load`* (`setProfessional(null)` antes do fetch): funciona para o sintoma, mas deixa outros estados (`reviewSort`, `isUpdatingBlock`, `error`) vazando entre perfis e mantém a corrida de respostas. Precisaria de mais código para menos garantia.
- *Ajustar só o guard para `if (isLoading) return <LoadingState />`*: esconde o perfil antigo, mas o estado ainda é compartilhado entre profissionais e a corrida de respostas continua possível.
- *Tirar a tela das abas e colocá-la em um Stack*: correção estrutural mais ampla, mexe na navegação de dois layouts e em todas as telas irmãs. Fora do escopo pedido e desproporcional ao problema.

### Decisão 2: manter todo o resto de `PublicProfessionalScreen` como está

Com a remontagem por `key`, o ciclo de carregamento, o tratamento de erro e o botão "Tentar novamente" já existentes atendem os requisitos. Não há necessidade de novo estado, novo hook ou novo componente. Simplicidade acima de abstração — o arquivo não ganha nada novo.

### Decisão 3: a rota continua sendo a dona da identidade

A decisão de "isso é outro conteúdo" fica no arquivo de rota, que é quem lê os params. A feature continua recebendo apenas `id` e não precisa saber que vive em uma aba singleton. Um comentário curto no arquivo de rota registra o porquê do `key`, para que ninguém o remova como se fosse ruído.

## Risks / Trade-offs

- **Perda do conteúdo já carregado ao reabrir o mesmo profissional** → Reabrir o mesmo `id` remonta e busca de novo, custando uma requisição. Aceitável: perfis são consultados poucas vezes por sessão, os dados (avaliações, disponibilidade, bloqueio) devem estar frescos, e a API está em plano pago sem cold start.
- **Perda de estado de UI ao trocar de perfil** (ex.: aba de ordenação de avaliações, posição de rolagem) → É o comportamento correto: o conteúdo é outro, o estado da tela anterior não se aplica.
- **Regressão silenciosa se alguém remover o `key`** → Mitigado pelo comentário na rota e pela verificação manual descrita em `tasks.md`.
- **Piscada de `LoadingState` onde antes havia conteúdo imediato** → É exatamente o comportamento pedido: melhor um carregamento honesto do que dados errados na tela.
