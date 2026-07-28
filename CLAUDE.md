# CLAUDE.md
# Responda sempre em pt-br
## Objetivo

Este projeto é um marketplace de serviços para Android e iOS.

Antes de implementar qualquer funcionalidade, entender o fluxo existente e manter consistência com a arquitetura atual.

Priorizar soluções simples, claras e fáceis de manter.

---

# Filosofia de Desenvolvimento

Sempre priorizar:

```txt
Clareza > esperteza
Simplicidade > abstração precoce
Segurança > facilidade
Organização > velocidade improvisada
Manutenção > gambiarra
```

Evitar engenharia excessiva.

O sistema ainda está em fase inicial e deve atender bem dezenas ou poucas centenas de usuários.

Não criar complexidade antecipada para problemas que ainda não existem.

---

# Regra de Simplicidade

Antes de implementar qualquer solução, perguntar:

```txt
Existe uma forma mais simples de resolver isso?
```

Preferir:

* Código simples
* Poucas abstrações
* Fluxos explícitos
* Estruturas previsíveis
* Fácil depuração

Evitar:

* Padrões complexos sem necessidade
* Arquiteturas excessivamente genéricas
* Camadas artificiais
* Abstrações criadas apenas para "escalar no futuro"

---

# Código Morto

Não manter código morto.

Remover:

* Funções não utilizadas
* Componentes não utilizados
* Hooks não utilizados
* Imports não utilizados
* Variáveis não utilizadas
* Arquivos abandonados
* Comentários obsoletos
* Código legado sem uso

Se algo não possui utilidade real no projeto, deve ser removido.

---

# Código Duplicado

Evitar duplicação.

Antes de criar algo novo:

* Procurar implementação existente.
* Reutilizar quando fizer sentido.
* Extrair apenas quando houver repetição real.

Não abstrair prematuramente.

---

# Responsabilidade das Camadas

O backend e o mobile são sistemas distintos.

Nunca misturar responsabilidades.

## Mobile

Responsável por:

* Interface
* Navegação
* Estado da aplicação
* Experiência do usuário
* Consumo da API

Não é responsável por:

* Banco de dados
* Autorização
* Regras críticas
* Segurança
* Lógica de autenticação do servidor

---

## Backend

Responsável por:

* Autenticação
* Autorização
* Banco de dados
* Regras de negócio
* Emails
* Segurança
* Validações críticas

Toda regra importante deve existir no backend.

Nunca confiar em validações do mobile.

---

# Estrutura do Projeto

```txt
apps/
  mobile/
  api/
```

O backend é hospedado separadamente e deve continuar independente do aplicativo mobile.

Toda comunicação ocorre através da API pública.

---

# Deploy e Ambiente (Render)

A API (`apps/api`) está hospedada em:

```txt
https://appsantiago.onrender.com
```

Regras:

* Deploy automático pelo branch `main`.
* Todo código enviado para `main` deve estar pronto para produção.
* Nunca assumir ambiente local.
* Nunca deixar URLs hardcoded.
* Sempre utilizar variáveis de ambiente.

---

# Variáveis de Ambiente

Produção utiliza:

```txt
BETTER_AUTH_URL
BETTER_AUTH_SECRET
DATABASE_URL
CORS_ORIGIN
EMAIL_PROVIDER
RESEND_API_KEY
APP_DEEP_LINK_SCHEME
```

Nunca expor secrets.

Nunca commitar:

```txt
.env
tokens
api keys
credenciais
```

Apenas `.env.example`.

---

# Resend

O domínio já está validado na Resend.

Assumir ambiente preparado para envio real de emails.

Fluxos obrigatórios:

* Verificação de email
* Recuperação de senha
* Redefinição de senha

Toda implementação deve ser pensada para envio real em produção.

Não utilizar soluções temporárias ou de sandbox.

---

# Homologação

As validações devem considerar:

```txt
Android Studio
Web
```

Toda entrega deve ser testável nesses ambientes.

---

# Tratamento de Erros

Tratamento de erros é obrigatório.

Toda operação assíncrona deve:

* Tratar falhas
* Retornar mensagens adequadas
* Registrar contexto suficiente para diagnóstico

Evitar erros genéricos.

Sempre que possível incluir:

```txt
O que falhou
Onde falhou
Motivo provável
Próximo passo recomendado
```

Sem expor informações sensíveis ao usuário.

---

# Logs

Logs devem ajudar na investigação.

Registrar:

* Fluxo executado
* Contexto relevante
* Erros inesperados

Não registrar:

* Senhas
* Tokens
* Secrets
* Dados sensíveis

---

# Banco de Dados

Toda alteração estrutural deve ocorrer através de migration.

Nunca depender de alterações manuais no banco.

Manter schema limpo e consistente.

---

# Segurança

Nunca confiar em dados vindos do cliente.

Toda informação recebida deve ser validada no backend.

Toda autorização deve ser feita no backend.

Toda regra de acesso deve ser validada no backend.

---

# Armadilhas Conhecidas (Mobile)

## Navegação resetada por refetch de sessão (better-auth + expo-router)

### Sintoma

Após uma ação de auth (ex: cadastro), o `router.replace` leva para a tela
correta, mas o app cai na tela âncora do grupo (geralmente o login).
Curiosamente, ao reabrir/rebuildar o app a tela correta aparece — porque aí
quem decide a rota é o `index.tsx`, de forma determinística.

### Causa

Operações do better-auth (`signUp`, `signIn`, `signOut`) disparam um refetch
da sessão. Isso faz `isPending` voltar a `true` por um instante, **mesmo com
`autoSignIn: false`**.

Se um layout de grupo (`_layout.tsx`) renderiza um spinner sempre que
`isPending` é `true`, ele **desmonta o `<Stack>` durante o refetch**. Isso
descarta a navegação em andamento e remonta a pilha na rota inicial do grupo.

```tsx
// ERRADO: desmonta a pilha a cada refetch de sessão
if (isPending) {
  return <Spinner />
}
return <Stack />
```

### Correção

Bloquear apenas no carregamento inicial. Refetches devem manter o `<Stack>`
montado para preservar a navegação.

```tsx
const hasLoadedOnce = useRef(false)

if (isPending && !hasLoadedOnce.current) {
  return <Spinner />
}
hasLoadedOnce.current = true

if (session) return <Redirect href={routes.home} />
return <Stack />
```

### Como identificar rápido

* A navegação funciona no rebuild (via `index.tsx`) mas falha logo após a ação.
* O destino errado é sempre a rota âncora do grupo de navegação.
* O problema some ao remover o `useSession` do layout — confirma o refetch
  como gatilho.

Regra geral: **um `_layout.tsx` não deve desmontar a pilha de navegação por
causa de um `isPending` transitório.** Distinguir "carregamento inicial" de
"revalidação".

---

# Qualidade de Código

Todo código novo deve ser:

* Legível
* Coeso
* Tipado corretamente
* Fácil de entender
* Fácil de manter

Evitar:

* Arquivos gigantes
* Funções gigantes
* Condicionais excessivas
* Complexidade desnecessária

---

# Antes de Finalizar Qualquer Tarefa

Verificar:

```txt
O código está realmente sendo usado?
Existe duplicação?
Existe uma solução mais simples?
Existe código morto?
Os erros estão tratados?
Está pronto para produção?
O backend continua independente do mobile?
As responsabilidades estão corretas?
```

Se alguma resposta for negativa, corrigir antes de concluir a implementação.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
