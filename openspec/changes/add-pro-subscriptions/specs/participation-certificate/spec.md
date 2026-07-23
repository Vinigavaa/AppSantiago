## ADDED Requirements

### Requirement: Emissão automática do certificado
O sistema SHALL emitir automaticamente um certificado de participação quando a assinatura de
um profissional passa a estar ativa, caso ele ainda não possua um certificado. O certificado
SHALL conter o nome do profissional, uma data de emissão e um código único. O sistema MUST
reutilizar dados já existentes no app (nome, nota, serviços concluídos) e não recriar
informação de perfil.

#### Scenario: Assinatura ativa emite certificado
- **WHEN** um profissional sem certificado tem a assinatura ativada e verificada
- **THEN** o servidor emite um certificado com nome, data de emissão e código único

#### Scenario: Reativação não duplica
- **WHEN** um profissional que já teve certificado renova ou restaura a assinatura
- **THEN** o servidor reaproveita/revalida o certificado existente em vez de criar outro

### Requirement: Natureza do certificado (não é credencial oficial)
O certificado SHALL deixar explícito que é um selo de participação e verificação na
plataforma, e MUST NOT ser apresentado como certificação técnica ou profissional oficial.
O texto exibido e a página de verificação SHALL conter esse aviso.

#### Scenario: Aviso de escopo presente
- **WHEN** o certificado é exibido no app ou na página pública de verificação
- **THEN** o texto informa que é um selo de participação/verificação da plataforma e não uma
  certificação técnica ou profissional oficial

### Requirement: Verificação pública por código
O sistema SHALL permitir que qualquer pessoa verifique um certificado pelo seu código único,
sem autenticação, e SHALL retornar se o certificado é válido no momento, junto com o nome do
profissional e a data. A verificação MUST NOT expor dados sensíveis ou de contato.

#### Scenario: Código de certificado válido
- **WHEN** alguém consulta um código cujo profissional tem assinatura ativa
- **THEN** o sistema responde "válido" com o nome do profissional e a data, e o aviso de
  escopo

#### Scenario: Código inexistente
- **WHEN** alguém consulta um código que não existe
- **THEN** o sistema responde que o certificado não foi encontrado, sem vazar outros dados

### Requirement: Invalidação ao perder a assinatura
O sistema SHALL marcar o certificado como inválido na verificação quando a assinatura do
profissional deixa de estar ativa (expirada ou cancelada e vencida). A invalidação SHALL ser
decidida no servidor a partir do status de assinatura autoritativo.

#### Scenario: Assinatura expira invalida o certificado
- **WHEN** a assinatura do profissional expira e alguém verifica o código dele
- **THEN** o sistema responde que o certificado está inválido

#### Scenario: Reativação revalida
- **WHEN** um profissional com certificado inválido reativa a assinatura
- **THEN** a verificação do mesmo código volta a responder "válido"
