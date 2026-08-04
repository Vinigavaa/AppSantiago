## ADDED Requirements

### Requirement: Campo focado visível acima do teclado
Toda tela ou modal do aplicativo que contenha campos de texto SHALL manter o campo atualmente focado inteiramente visível acima do teclado virtual, ajustando o conteúdo automaticamente quando o teclado abrir.

#### Scenario: Campo no fim de um formulário longo
- **WHEN** o usuário toca em um campo posicionado abaixo da altura do teclado (ex.: descrição do serviço no formulário de solicitação)
- **THEN** o conteúdo rola automaticamente até que o campo focado fique totalmente visível acima do teclado

#### Scenario: Troca de campo com teclado aberto
- **WHEN** o usuário, com o teclado já aberto, toca em outro campo do mesmo formulário
- **THEN** o conteúdo se reajusta para deixar o novo campo focado totalmente visível

#### Scenario: Fechamento do teclado
- **WHEN** o teclado é fechado (botão voltar, arraste na lista ou toque fora do campo)
- **THEN** o conteúdo retorna à posição original sem espaço residual no fim da tela

### Requirement: Sugestões de cidade visíveis acima do teclado
O seletor de cidade SHALL manter, simultaneamente, o campo de busca e a lista de sugestões visíveis e utilizáveis acima do teclado enquanto o usuário digita.

#### Scenario: Digitação com sugestões carregadas
- **WHEN** o usuário abre o seletor de cidade e digita um termo que retorna resultados
- **THEN** o campo de busca permanece visível, a lista de sugestões é exibida integralmente acima do teclado e é rolável

#### Scenario: Seleção de uma sugestão
- **WHEN** o usuário toca em uma cidade da lista com o teclado aberto
- **THEN** a cidade é selecionada no primeiro toque, sem que o toque seja consumido apenas para fechar o teclado

#### Scenario: Sheet com muitos resultados
- **WHEN** a busca retorna mais resultados do que cabem na área visível acima do teclado
- **THEN** a lista rola dentro do sheet, sem que nenhum item fique inacessível atrás do teclado

### Requirement: Ajuste de teclado sem quebra de layout
O ajuste ao teclado SHALL preservar o layout da tela, sem gerar espaçamento excessivo, sobreposição de elementos ou ocultação de ações primárias.

#### Scenario: Ajuste único por plataforma
- **WHEN** o teclado abre em uma tela de formulário no Android
- **THEN** apenas um mecanismo de ajuste atua (o redimensionamento da janela), sem padding adicional que duplique o deslocamento

#### Scenario: Ação primária alcançável
- **WHEN** o teclado está aberto em um formulário com botão de envio ao final
- **THEN** o botão continua alcançável por rolagem, sem ficar preso atrás do teclado

#### Scenario: Cabeçalho preservado
- **WHEN** o teclado abre em um modal com cabeçalho e título
- **THEN** o cabeçalho não é comprimido a ponto de desaparecer nem sobrepõe o conteúdo

### Requirement: Comportamento consistente entre Android e iOS
O comportamento do teclado SHALL ser equivalente em Android e iOS, usando em cada plataforma o mecanismo nativo adequado, sem divergência perceptível para o usuário.

#### Scenario: Mesmo formulário nas duas plataformas
- **WHEN** o mesmo formulário é aberto no Android e no iOS e um campo inferior recebe foco
- **THEN** em ambas as plataformas o campo fica visível acima do teclado e a rolagem se comporta da mesma forma

### Requirement: Dispensa previsível do teclado
Áreas roláveis de formulário SHALL permitir dispensar o teclado por arraste e SHALL preservar toques em elementos interativos enquanto o teclado está aberto.

#### Scenario: Arraste fecha o teclado
- **WHEN** o usuário arrasta a área rolável do formulário com o teclado aberto
- **THEN** o teclado é fechado durante o arraste

#### Scenario: Toque em botão com teclado aberto
- **WHEN** o usuário toca em um botão ou item de lista dentro da área rolável com o teclado aberto
- **THEN** a ação do elemento é executada no mesmo toque

### Requirement: Padrão reutilizável para novos formulários
O projeto SHALL oferecer um componente único e documentado de área de formulário com tratamento de teclado, e todas as telas e modais com campos de texto SHALL utilizá-lo em vez de tratamentos ad-hoc.

#### Scenario: Nova tela de formulário
- **WHEN** uma nova tela com campos de texto é criada usando o componente padrão
- **THEN** ela apresenta o comportamento de teclado especificado sem configuração adicional

#### Scenario: Ausência de tratamentos divergentes
- **WHEN** o código do aplicativo é inspecionado após a mudança
- **THEN** não restam usos de `KeyboardAvoidingView` ou `ScrollView` cru em formulários que dupliquem ou substituam o componente padrão
