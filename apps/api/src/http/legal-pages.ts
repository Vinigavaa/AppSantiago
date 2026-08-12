import { Hono } from "hono"

// Termos de Uso e Politica de Privacidade servidos pela propria API. As URLs sao
// as que a tela de assinatura do app ja aponta por padrao, e as que ficam
// cadastradas na ficha da Play Store e no App Store Connect.
//
// Os documentos vivem aqui como dado (e nao como arquivos .html em disco) para
// compilarem junto com o resto da API: nao ha risco de um arquivo estatico ficar
// fora do diretorio de build no Render.

// Controlador dos dados (LGPD). Fica em constante, e nao em variavel de ambiente:
// uma env faltando no Render renderizaria a pagina legal sem canal de contato, e
// so seria percebido na reprovacao da loja. Nao e segredo.
const CONTROLLER = {
  name: "Rodrigo Santiago",
  email: "maosaobra@suporte.com.br",
}

// Data literal, nunca `new Date()`: uma data dinamica afirmaria que o documento
// foi revisado hoje toda vez que a pagina abre.
const LAST_UPDATED = "8 de agosto de 2026"

const APP_NAME = "FazAí"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

type Section = {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

type DocumentInput = {
  title: string
  intro: string
  sections: Section[]
}

function renderSection(section: Section, index: number) {
  const paragraphs = (section.paragraphs ?? [])
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("")
  const bullets = section.bullets?.length
    ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : ""

  return `<section>
        <h2>${index + 1}. ${escapeHtml(section.heading)}</h2>
        ${paragraphs}
        ${bullets}
      </section>`
}

function renderDocument(input: DocumentInput) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.title)} — ${escapeHtml(APP_NAME)}</title>
    <style>
      * { box-sizing:border-box; }
      body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background:#F1F5F9; color:#0F172A; padding:24px 16px 64px; line-height:1.65; }
      main { max-width:720px; margin:0 auto; background:#FFFFFF; padding:32px 24px; border-radius:16px; box-shadow:0 10px 30px rgba(15,23,42,0.08); overflow-wrap:break-word; }
      .badge { display:inline-block; padding:6px 12px; border-radius:999px; background:#EAEAF3; color:#05013D; font-weight:700; font-size:12px; letter-spacing:1px; text-transform:uppercase; }
      h1 { margin:16px 0 4px; font-size:26px; line-height:1.25; }
      h2 { margin:32px 0 8px; font-size:18px; line-height:1.35; }
      p { color:#334155; margin:0 0 12px; }
      ul { color:#334155; margin:0 0 12px; padding-left:20px; }
      li { margin-bottom:6px; }
      a { color:#05013D; }
      .updated { color:#64748B; font-size:13px; margin:0 0 24px; }
      .intro { color:#334155; }
      footer { max-width:720px; margin:24px auto 0; text-align:center; color:#94A3B8; font-size:12px; }
      footer a { color:#64748B; }
    </style>
  </head>
  <body>
    <main>
      <span class="badge">${escapeHtml(APP_NAME)}</span>
      <h1>${escapeHtml(input.title)}</h1>
      <p class="updated">Última atualização: ${escapeHtml(LAST_UPDATED)}</p>
      <p class="intro">${escapeHtml(input.intro)}</p>
      ${input.sections.map(renderSection).join("\n      ")}
    </main>
    <footer>
      <a href="/termos">Termos de Uso</a> · <a href="/privacidade">Política de Privacidade</a>
    </footer>
  </body>
</html>`
}

const termsSections: Section[] = [
  {
    heading: "O que o FazAí é",
    paragraphs: [
      "O FazAí é um aplicativo que conecta pessoas que precisam de um serviço a profissionais que oferecem esse serviço. Funcionamos como um ponto de encontro: o cliente descreve o que precisa, profissionais da categoria e da cidade enviam propostas, e as duas partes conversam pelo aplicativo até fechar (ou não) um acordo.",
      "Não executamos, não supervisionamos e não garantimos a execução de nenhum serviço anunciado na plataforma. Não somos empregadores, contratantes, intermediários de pagamento nem representantes dos profissionais cadastrados.",
    ],
  },
  {
    heading: "O contrato do serviço é entre você e a outra parte",
    paragraphs: [
      "Quando um cliente aceita a proposta de um profissional, o contrato de prestação de serviço nasce entre esses dois — não com o FazAí. Preço, prazo, escopo, forma de pagamento, garantia e qualquer outra condição são acordados diretamente entre as partes.",
      "Não intermediamos nem processamos o pagamento dos serviços. O que é combinado e pago fora do aplicativo é responsabilidade de quem combinou.",
      "Verificamos o cadastro na medida do que o próprio usuário informa. Não conferimos habilitação técnica, registro em conselho de classe, antecedentes ou capacidade financeira de ninguém. Avalie a outra parte antes de fechar negócio.",
    ],
  },
  {
    heading: "Sua conta",
    paragraphs: [
      "Para usar o aplicativo você precisa criar uma conta com dados verdadeiros e manter seu email e telefone atualizados. Você é responsável por tudo o que acontece na sua conta e por manter sua senha em sigilo.",
      "É preciso ter pelo menos 18 anos para se cadastrar.",
      "Você pode excluir sua conta a qualquer momento pelo próprio aplicativo, na tela de perfil.",
    ],
  },
  {
    heading: "Assinatura do profissional",
    paragraphs: [
      "Profissionais podem assinar um plano pago para ampliar sua presença na plataforma. A assinatura é opcional: o cadastro e o uso básico do aplicativo são gratuitos.",
      "A compra é feita e cobrada pela loja do seu dispositivo — App Store, da Apple, ou Google Play, do Google. Não recebemos nem armazenamos os dados do seu cartão; quem processa o pagamento é a loja.",
      "A assinatura renova automaticamente ao fim de cada período até que seja cancelada. A cobrança da renovação acontece dentro das 24 horas anteriores ao fim do período vigente, no mesmo meio de pagamento cadastrado na loja.",
      "O cancelamento é feito na própria loja, nas configurações de assinaturas da sua conta Apple ou Google — não conseguimos cancelar por você. Ao cancelar, as vantagens do plano seguem ativas até o fim do período já pago, e não há cobrança nova depois disso.",
      "Pedidos de reembolso seguem a política da loja onde a compra foi feita. Alterações de preço são comunicadas com antecedência pela loja e só passam a valer nas renovações seguintes, após o seu aceite quando exigido.",
      "Se a renovação falhar, a loja pode conceder um período de tolerância antes de encerrar a assinatura. Durante esse período as vantagens continuam ativas.",
    ],
  },
  {
    heading: "Regras de conduta",
    paragraphs: ["Ao usar o FazAí, você concorda em não:"],
    bullets: [
      "Publicar informação falsa sobre sua identidade, sua qualificação ou o serviço oferecido",
      "Oferecer ou solicitar serviços ilegais, perigosos ou que exijam habilitação que você não possui",
      "Assediar, ameaçar, ofender ou discriminar qualquer pessoa, dentro ou fora do chat",
      "Enviar conteúdo sexual, violento, enganoso ou que viole direitos de terceiros",
      "Usar a plataforma para spam, propaganda não relacionada ou aliciamento de usuários para outros fins",
      "Tentar burlar, sobrecarregar ou obter acesso não autorizado a qualquer parte do sistema",
      "Criar contas múltiplas para contornar bloqueios, avaliações negativas ou suspensões",
    ],
  },
  {
    heading: "Conteúdo ofensivo e denúncias",
    paragraphs: [
      "Não há tolerância a conteúdo ofensivo nem a usuários abusivos no FazAí. Mensagens, descrições de serviço, perfis, fotos de portfólio e avaliações passam por um filtro automático que bloqueia termos ofensivos antes da publicação — e o filtro não substitui a sua denúncia.",
      "Você pode denunciar qualquer conteúdo ou usuário diretamente no aplicativo: na conversa (no menu do topo ou pressionando uma mensagem recebida), no perfil do profissional, na solicitação de serviço e nas avaliações. A denúncia é anônima para a pessoa denunciada.",
      "Analisamos toda denúncia em até 24 horas. Confirmada a violação, o conteúdo é removido e o usuário responsável pode ser suspenso ou ter a conta encerrada, conforme a gravidade e a reincidência.",
      "Você também pode bloquear qualquer usuário a qualquer momento, sem precisar denunciar. Ao bloquear, vocês deixam de aparecer um para o outro e não trocam mais mensagens; o bloqueio pode ser desfeito em Perfil › Usuários bloqueados.",
      `Se preferir, denúncias e dúvidas sobre moderação também podem ser enviadas para ${CONTROLLER.email}.`,
    ],
  },
  {
    heading: "Avaliações e reputação",
    paragraphs: [
      "Após a conclusão de um serviço, cliente e profissional podem se avaliar. As avaliações refletem a opinião de quem as escreveu e ficam visíveis no perfil do avaliado.",
      "Podemos remover avaliações que violem as regras de conduta, mas não editamos nem negociamos o conteúdo de uma avaliação legítima a pedido do avaliado.",
    ],
  },
  {
    heading: "Suspensão e encerramento de conta",
    paragraphs: [
      "Podemos suspender ou encerrar uma conta, com ou sem aviso prévio conforme a gravidade, quando houver descumprimento destes Termos, suspeita fundada de fraude, risco à segurança de outros usuários ou determinação legal.",
      "Enquanto suspensa, a conta não consegue acessar o aplicativo e o perfil deixa de aparecer nas buscas. Ao entrar, você vê o motivo da suspensão e o endereço para contestar.",
      "Se a sua conta for encerrada e houver assinatura ativa, o cancelamento na loja continua sendo feito por você — encerrar a conta no aplicativo não cancela a cobrança da Apple ou do Google.",
    ],
  },
  {
    heading: "Disponibilidade do serviço",
    paragraphs: [
      "Trabalhamos para manter o aplicativo no ar, mas ele pode ficar indisponível por manutenção, falha técnica ou causa fora do nosso controle. Não garantimos disponibilidade ininterrupta nem ausência de erros.",
      "Podemos alterar, suspender ou descontinuar funcionalidades. Mudanças relevantes são comunicadas pelo aplicativo ou por email.",
    ],
  },
  {
    heading: "Limitação de responsabilidade",
    paragraphs: [
      "Como não executamos os serviços contratados pela plataforma, não respondemos pela qualidade, pelo prazo, pela segurança ou pelo resultado de nenhum deles, nem por danos decorrentes da relação entre cliente e profissional.",
      "Também não respondemos por prejuízos causados por informação falsa fornecida por outro usuário, por acordos feitos fora do aplicativo ou por indisponibilidade temporária do serviço.",
      "Nada aqui afasta os direitos que o Código de Defesa do Consumidor garante a você em relação ao próprio aplicativo.",
    ],
  },
  {
    heading: "Alterações destes Termos",
    paragraphs: [
      "Estes Termos podem ser atualizados. A data da última atualização fica no topo desta página, e mudanças relevantes são comunicadas pelo aplicativo ou por email antes de entrarem em vigor.",
      "Continuar usando o aplicativo depois de uma alteração significa que você concorda com a versão vigente.",
    ],
  },
  {
    heading: "Contato e foro",
    paragraphs: [
      `Dúvidas sobre estes Termos podem ser enviadas para ${CONTROLLER.email}.`,
      "Estes Termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do usuário para resolver qualquer controvérsia.",
    ],
  },
]

export const legalPages = new Hono()

legalPages.get("/termos", (context) => {
  return context.html(
    renderDocument({
      title: "Termos de Uso",
      intro: `Estes Termos regem o uso do aplicativo ${APP_NAME}. Ao criar uma conta ou usar o aplicativo, você concorda com o que está descrito aqui. Leia com atenção — em especial a seção sobre assinatura, se você é profissional.`,
      sections: termsSections,
    }),
  )
})

// A lista de dados coletados abaixo foi escrita a partir do schema do banco
// (packages/database/prisma/schema.prisma). Toda mudanca que passe a coletar um
// dado pessoal novo precisa aparecer aqui.
const privacySections: Section[] = [
  {
    heading: "Quem é o controlador dos seus dados",
    paragraphs: [
      `O controlador dos dados pessoais tratados no aplicativo ${APP_NAME} é ${CONTROLLER.name}, pessoa física.`,
      `Para exercer qualquer direito previsto nesta Política ou tirar dúvidas sobre o tratamento dos seus dados, escreva para ${CONTROLLER.email}.`,
    ],
  },
  {
    heading: "Quais dados coletamos",
    paragraphs: [
      "Coletamos apenas o necessário para o aplicativo funcionar. Todos os dados abaixo são fornecidos por você ou gerados pelo seu uso da plataforma:",
    ],
    bullets: [
      "Cadastro: nome, email, senha (guardada apenas como hash, nunca em texto), telefone, nome de usuário e foto de perfil, quando você escolhe informá-los",
      "Perfil: se você é profissional, sua descrição, profissão, categorias de atuação, cidades onde atende e fotos de portfólio",
      "CPF ou CNPJ: apenas quando você opta por informar — o cadastro funciona sem ele",
      "Pedidos de serviço: título, descrição, categoria, cidade, bairro, faixa de orçamento, urgência e fotos que você anexa",
      "Endereço completo (rua, número, complemento, CEP): coletado apenas após a contratação, para que o profissional saiba onde executar o serviço",
      "Chat: o conteúdo das mensagens trocadas com a outra parte e as imagens anexadas a elas",
      "Avaliações: a nota e o comentário que você escreve sobre a outra parte, e os que escrevem sobre você",
      "Assinatura, para profissionais: plano, situação, loja de origem e identificador da compra — não recebemos nem armazenamos dados do seu cartão",
      "Dispositivo: o token de notificação push do aparelho, para conseguirmos avisar você sobre mensagens e propostas",
      "Sessão: endereço IP e identificação do navegador ou aplicativo (user-agent) no momento do login",
    ],
  },
  {
    heading: "Para que usamos e com qual base legal",
    paragraphs: [
      "Execução do contrato: criar e manter sua conta, exibir seu perfil, distribuir seus pedidos aos profissionais da região, permitir o chat, registrar propostas e contratações, e controlar a situação da sua assinatura.",
      "Legítimo interesse: enviar notificações sobre atividades da sua conta, prevenir fraude e abuso, aplicar bloqueios entre usuários, e manter a segurança e a estabilidade do sistema.",
      "Cumprimento de obrigação legal: responder a determinações de autoridade competente e manter registros exigidos por lei.",
      "Consentimento: envio de notificações push, que você pode desativar a qualquer momento nas configurações do seu aparelho, e os dados opcionais que você escolhe informar, como CPF ou CNPJ e foto de perfil.",
    ],
  },
  {
    heading: "O que fica visível para outros usuários",
    paragraphs: [
      "Seu nome, sua foto de perfil e suas avaliações recebidas ficam visíveis para os demais usuários da plataforma. No caso de profissionais, também a descrição, a profissão, as categorias, as cidades de atuação e as fotos de portfólio.",
      "Seu email, seu telefone e seu CPF ou CNPJ não são exibidos publicamente. O endereço completo do serviço é liberado ao profissional apenas depois que você aceita a proposta dele.",
      "As mensagens do chat são visíveis apenas para você e a outra parte da conversa.",
    ],
  },
  {
    heading: "Com quem compartilhamos",
    paragraphs: [
      "Não vendemos seus dados e não os compartilhamos para publicidade de terceiros. Usamos os seguintes prestadores de serviço, cada um tratando apenas o dado necessário para a sua função:",
    ],
    bullets: [
      "Render — hospedagem do servidor da aplicação",
      "Banco de dados PostgreSQL gerenciado — armazenamento dos dados da plataforma",
      "Resend — envio dos emails de verificação de conta e de redefinição de senha",
      "Cloudinary — armazenamento das imagens de perfil, de portfólio, de pedidos e do chat",
      "Expo — entrega das notificações push aos aparelhos",
      "RevenueCat, Apple e Google — processamento e verificação das assinaturas dos profissionais",
    ],
  },
  {
    heading: "Transferência internacional",
    paragraphs: [
      "Alguns dos prestadores acima mantêm servidores fora do Brasil. Nesses casos a transferência ocorre para viabilizar a execução do contrato com você, conforme permitido pela Lei Geral de Proteção de Dados.",
    ],
  },
  {
    heading: "Por quanto tempo guardamos",
    paragraphs: [
      "Mantemos seus dados enquanto sua conta existir. Se você excluir a conta, os dados são apagados imediatamente, incluindo suas imagens no serviço de armazenamento.",
      "Duas exceções: as mensagens que você enviou permanecem visíveis para a outra parte da conversa, e as avaliações que você escreveu sobre outras pessoas permanecem no perfil delas — apagá-las alteraria a reputação de terceiros que não pediram a exclusão.",
      "Registros que a lei nos obrigue a manter, como logs de acesso, são guardados pelo prazo legal e depois descartados.",
    ],
  },
  {
    heading: "Seus direitos",
    paragraphs: [
      "A Lei Geral de Proteção de Dados garante a você o direito de:",
    ],
    bullets: [
      "Confirmar se tratamos dados seus e acessar esses dados",
      "Corrigir dados incompletos, inexatos ou desatualizados",
      "Solicitar a exclusão dos dados tratados com base no seu consentimento",
      "Pedir a portabilidade dos seus dados a outro fornecedor",
      "Saber com quem compartilhamos seus dados",
      "Revogar o consentimento dado para um tratamento específico",
      "Se opor a um tratamento que você considere irregular",
    ],
  },
  {
    heading: "Como exercer seus direitos",
    paragraphs: [
      "A maior parte pode ser resolvida no próprio aplicativo: dados de cadastro são editáveis na tela de perfil, e a exclusão definitiva da conta também está lá.",
      `Para os demais pedidos, escreva para ${CONTROLLER.email}. Respondemos em até 15 dias. Podemos pedir informações adicionais para confirmar sua identidade antes de atender a um pedido — é uma proteção sua, para que ninguém obtenha seus dados se passando por você.`,
    ],
  },
  {
    heading: "Segurança",
    paragraphs: [
      "As senhas são armazenadas apenas como hash e não podem ser lidas por nós. O tráfego entre o aplicativo e o servidor é criptografado, e o acesso ao banco de dados é restrito.",
      "Nenhum sistema é totalmente imune. Se ocorrer um incidente de segurança com risco relevante aos seus dados, comunicaremos você e a Autoridade Nacional de Proteção de Dados, como exige a lei.",
    ],
  },
  {
    heading: "Crianças e adolescentes",
    paragraphs: [
      "O aplicativo é destinado a maiores de 18 anos e não coletamos intencionalmente dados de menores. Se identificarmos uma conta de menor de idade, ela será excluída.",
    ],
  },
  {
    heading: "Alterações desta Política",
    paragraphs: [
      "Esta Política pode ser atualizada. A data da última atualização fica no topo desta página, e mudanças relevantes no tratamento dos seus dados são comunicadas pelo aplicativo ou por email.",
    ],
  },
]

legalPages.get("/privacidade", (context) => {
  return context.html(
    renderDocument({
      title: "Política de Privacidade",
      intro: `Esta Política explica quais dados pessoais o aplicativo ${APP_NAME} coleta, por que coleta, com quem compartilha e como você pode controlá-los. Ela foi escrita para ser lida — sem jargão desnecessário.`,
      sections: privacySections,
    }),
  )
})

// Indice. E a URL unica e estavel para cadastrar na ficha das lojas e para quem
// chega digitando o endereco.
legalPages.get("/legal", (context) => {
  return context.html(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Documentos legais — ${escapeHtml(APP_NAME)}</title>
    <style>
      body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background:#F1F5F9; color:#0F172A; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; line-height:1.65; }
      main { background:#FFFFFF; max-width:480px; width:100%; padding:32px 24px; border-radius:16px; box-shadow:0 10px 30px rgba(15,23,42,0.08); }
      .badge { display:inline-block; padding:6px 12px; border-radius:999px; background:#EAEAF3; color:#05013D; font-weight:700; font-size:12px; letter-spacing:1px; text-transform:uppercase; }
      h1 { margin:16px 0 8px; font-size:24px; }
      p { color:#475569; margin:0 0 24px; }
      a.button { display:block; text-align:center; padding:14px 18px; border-radius:10px; text-decoration:none; font-weight:600; background:#05013D; color:#FFFFFF; margin-bottom:12px; }
    </style>
  </head>
  <body>
    <main>
      <span class="badge">${escapeHtml(APP_NAME)}</span>
      <h1>Documentos legais</h1>
      <p>Última atualização: ${escapeHtml(LAST_UPDATED)}</p>
      <a class="button" href="/termos">Termos de Uso</a>
      <a class="button" href="/privacidade">Política de Privacidade</a>
    </main>
  </body>
</html>`)
})
