# Feature Specification: DriverFin V1

**Feature Branch**: `main` (branch atual; não foi criada branch de feature)

**Created**: 2026-09-08

**Status**: Especificação validada para planejamento; produto ainda não implementado

**Input**: Criar a especificação funcional da V1 responsiva e mobile first do DriverFin,
com autenticação, um veículo por usuário, CRUD de ganhos e despesas, dashboard financeiro
e perfil, respeitando integralmente o MVP e a constituição.

## V1 Scope & Constitution Alignment *(mandatory)*

### Objetivo

Permitir que motoristas de aplicativo registrem seus ganhos e despesas manualmente e
entendam receita, custos e lucro do período, incluindo resultados por hora e quilômetro,
sem depender de planilhas complexas. Entregar uma V1 funcional, testada, documentada e
publicamente acessível para portfólio.

A referência normativa é a [constituição v1.0.0](../../.specify/memory/constitution.md).
Esta especificação define comportamentos observáveis; decisões de implementação pertencem
ao plano e devem respeitar a direção técnica já aprovada na constituição.

### Escopo aprovado

- Cadastro de usuário, login, logout e recuperação de senha.
- Cadastro e consulta de um único veículo por usuário.
- Criação, consulta, edição e exclusão de ganhos e despesas próprios.
- Dashboard com os 12 componentes financeiros especificados e filtros Hoje, Semana e Mês.
- Perfil com consulta do nome e e-mail do próprio usuário.
- Uso dos fluxos principais em smartphones e desktop, com feedback explícito.

**Classificação**: Necessária para V1. Cada capacidade atende ao MVP solicitado ou às
condições constitucionais para seu funcionamento e publicação.

**Necessária para colocar a V1 no ar?** Sim: este documento cobre a entrega completa.
Histórias individuais são incrementos verificáveis, não uma redução do MVP obrigatório.

### Fora do escopo e Backlog V2

Não serão implementados na V1: múltiplos veículos, integração automática com Uber ou 99,
Open Finance, importação de extratos bancários, OCR, cálculo avançado de consumo de
combustível, manutenção preventiva, IPVA e licenciamento, metas financeiras, notificações,
PWA, aplicativo nativo, dark mode, login social, exportação para Excel ou PDF, análise
financeira com IA e planos pagos.

Esses itens constituem o Backlog V2, sem compromisso de implementação e sem dependência
para publicar a V1. O período personalizado também fica adiado; os três filtros
obrigatórios atendem à entrega atual. Seu eventual retorno exige classificação de escopo
conforme a constituição, sem atrasar a publicação.

Também não fazem parte desta entrega: gestão de categorias ou plataformas pelo usuário,
cadastro de corridas individuais, exclusão de conta, edição de nome/e-mail no perfil,
foto, preferências, histórico de veículos, edição ou exclusão de veículo. Não são exigidos
fluxos adicionais de cadastro, como confirmação de e-mail. A mensagem de recuperação de
senha integra a autenticação obrigatória e não representa uma central de notificações.

### Atores

- **Visitante**: pessoa sem sessão válida; pode criar conta, entrar e recuperar senha.
- **Motorista autenticado**: único papel de usuário da V1; acessa seu perfil, veículo,
  ganhos, despesas e dashboard. Não há papel administrativo nem acesso a dados de terceiros.

## User Scenarios & Testing *(mandatory)*

As prioridades ordenam o trabalho; todas as histórias são obrigatórias. Testes isolados
podem utilizar uma conta e lançamentos preparados. A jornada usual é cadastrar-se, entrar,
cadastrar veículo, registrar ganhos/despesas e consultar o dashboard. O veículo não
bloqueia lançamentos nem consulta financeira, evitando um assistente obrigatório.

### User Story 1 - Criar conta e controlar o acesso (Priority: P1)

Como motorista, quero criar minha conta e entrar com segurança para manter meus registros
separados dos demais usuários e encerrar meu acesso quando terminar.

**Why this priority**: É a base do acesso individual aos dados.

**Independent Test**: Com dois usuários distintos, cadastrar, entrar, consultar o perfil,
sair e tentar acessar registros protegidos com e sem sessão válida.

**Acceptance Scenarios**:

1. **Given** um visitante com nome, e-mail válido ainda não cadastrado e senha válida,
   **When** conclui o cadastro, **Then** a conta é criada uma única vez e o login é oferecido.
2. **Given** campos ausentes, e-mail inválido ou senha fora da regra, **When** envia o
   cadastro, **Then** recebe erros associados aos campos e nenhuma conta é criada.
3. **Given** um e-mail já cadastrado, inclusive com diferença apenas de maiúsculas,
   **When** tenta criar outra conta, **Then** a duplicação é impedida.
4. **Given** uma conta existente, **When** fornece credenciais válidas, **Then** entra no
   dashboard; credenciais inválidas produzem mensagem genérica sem revelar qual falhou.
5. **Given** uma sessão válida, **When** faz logout, **Then** retorna ao login e aquela
   sessão deixa de permitir consulta, alteração ou renovação de acesso aos dados.
6. **Given** ausência de sessão válida ou acesso a registro de outro usuário,
   **When** tenta uma ação protegida, **Then** nenhum dado alheio é exibido ou alterado.

### User Story 2 - Recuperar a senha (Priority: P1)

Como motorista que esqueceu a senha, quero recuperar o acesso usando meu e-mail cadastrado.

**Why this priority**: A recuperação é parte obrigatória de uma autenticação funcional.

**Independent Test**: Solicitar recuperação, usar a mensagem recebida, definir nova senha
e verificar que a senha anterior e o link usado não funcionam mais.

**Acceptance Scenarios**:

1. **Given** um e-mail cadastrado, **When** solicita recuperação, **Then** recebe um link
   para definir nova senha e vê confirmação genérica da solicitação.
2. **Given** e-mail não cadastrado, **When** solicita recuperação, **Then** vê a mesma
   confirmação, sem revelação da existência de conta.
3. **Given** link válido e não utilizado, **When** salva uma senha válida, **Then** pode
   entrar com ela; a senha anterior, o link utilizado e as sessões anteriores deixam de valer.
4. **Given** link inválido, utilizado ou expirado, **When** tenta redefinir a senha,
   **Then** nenhuma senha muda e a tela oferece solicitar novo link.
5. **Given** um link válido, **When** envia senha inválida, **Then** recebe a regra não
   atendida e pode corrigir sem consumir o link.

### User Story 3 - Cadastrar veículo e consultar perfil (Priority: P2)

Como motorista, quero registrar meu único veículo e consultar meus dados de identificação.

**Why this priority**: Atende ao cadastro mínimo previsto sem criar gestão de frota.

**Independent Test**: Em uma conta nova, consultar o perfil, cadastrar veículo sem placa,
reabrir os dados e tentar cadastrar um segundo veículo.

**Acceptance Scenarios**:

1. **Given** usuário autenticado sem veículo, **When** informa marca, modelo, ano e
   combustível válidos, **Then** o veículo é salvo e pode ser consultado; placa é opcional.
2. **Given** campos obrigatórios ausentes ou ano inválido, **When** tenta salvar,
   **Then** recebe validação por campo e nenhum veículo incompleto é criado.
3. **Given** usuário com veículo, **When** acessa essa área, **Then** vê seu cadastro;
   qualquer tentativa de criar um segundo, inclusive simultânea, é impedida.
4. **Given** usuário autenticado, **When** abre o perfil, **Then** vê somente seu nome
   e e-mail, sem senha ou outros dados sensíveis.

### User Story 4 - Controlar ganhos (Priority: P2)

Como motorista, quero registrar e corrigir ganhos com tempo e distância para acompanhar
minha atividade financeira.

**Why this priority**: Os ganhos fornecem receita e denominadores dos indicadores.

**Independent Test**: Criar, listar, consultar, editar e excluir um ganho próprio;
confirmar a persistência e os reflexos financeiros após cada operação.

**Acceptance Scenarios**:

1. **Given** usuário autenticado, **When** salva data, plataforma, valor, quantidade de
   corridas, horas e km válidos, **Then** o ganho aparece na listagem com todos esses dados.
2. **Given** um ganho existente, **When** consulta e edita seus campos com dados válidos,
   **Then** a alteração persiste após recarregar e substitui os valores anteriores nos totais.
3. **Given** um ganho próprio, **When** confirma exclusão, **Then** ele desaparece da
   listagem e dos resultados; cancelar a confirmação preserva o registro.
4. **Given** campo obrigatório ausente, plataforma inexistente ou número inválido,
   **When** tenta salvar, **Then** recebe erros e o registro anterior permanece intacto.
5. **Given** ganhos legítimos na mesma data e plataforma, **When** registra outro,
   **Then** ambos são mantidos; coincidência de campos não implica duplicidade indevida.

### User Story 5 - Controlar despesas (Priority: P2)

Como motorista, quero registrar rapidamente os custos de trabalhar e corrigir lançamentos.

**Why this priority**: As despesas permitem calcular o lucro em vez de apenas a receita.

**Independent Test**: Criar despesa sem descrição, listar, consultar, editar e excluir,
verificando os totais e categorias em cada passo.

**Acceptance Scenarios**:

1. **Given** usuário autenticado, **When** informa valor, categoria e data válidos e
   salva, **Then** a despesa é registrada sem exigir descrição ou etapas adicionais.
2. **Given** despesa própria, **When** consulta ou edita qualquer campo permitido,
   **Then** vê os dados e a alteração válida persiste na listagem e no dashboard.
3. **Given** despesa própria, **When** confirma exclusão, **Then** ela deixa de compor
   gastos e lucro; cancelar mantém os dados.
4. **Given** categoria inexistente, valor inválido ou data ausente, **When** envia o
   formulário, **Then** vê validação e nenhuma alteração parcial é salva.

### User Story 6 - Entender o resultado financeiro (Priority: P3)

Como motorista, quero consultar resultados de hoje, da semana e do mês para entender
quanto ganhei, gastei e lucrei, e o retorno por hora e km.

**Why this priority**: Consolida os registros anteriores no benefício central do produto.

**Independent Test**: Preparar ganhos e despesas conhecidos dentro e fora dos períodos,
incluindo registros de outro usuário, e comparar todos os componentes com o resultado esperado.

**Acceptance Scenarios**:

1. **Given** receita de R$ 300,00, despesas de R$ 120,00, 6 horas e 100 km no período,
   **When** consulta o dashboard, **Then** vê lucro de R$ 180,00, margem de 60,00%,
   receita/hora de R$ 50,00, lucro/hora de R$ 30,00, receita/km de R$ 3,00 e lucro/km de R$ 1,80.
2. **Given** registros em diferentes datas, **When** troca Hoje, Semana ou Mês,
   **Then** todos os indicadores, gráficos e últimos lançamentos usam o mesmo período
   visível e excluem os registros de fora dele e de outros usuários.
3. **Given** ganhos de Uber e Particular e despesas de Combustível e Alimentação,
   **When** consulta as distribuições, **Then** vê as somas corretas por plataforma e
   categoria; a evolução mostra receita, despesas e lucro por dia.
4. **Given** um período sem registros, **When** abre o dashboard, **Then** os totais
   são zero, razões sem denominador são “—” e as áreas vazias explicam a ausência de dados.
5. **Given** despesas de R$ 50,00 e nenhuma receita, **When** consulta o período,
   **Then** vê lucro de -R$ 50,00 e margem “—”; se também não há horas ou km, suas razões
   mostram “—”, sem NaN, Infinity ou valor inválido.
6. **Given** lançamento alterado, excluído ou transferido de data por edição,
   **When** retorna ao dashboard, **Then** os resultados refletem os dados atuais e o
   período correto, sem exigir sair da conta.

### Edge Cases

| Caso | Resultado obrigatório |
|------|-----------------------|
| Zero horas ou zero km com receita positiva | Apenas as razões cujo denominador é zero ficam “—”; receita e lucro continuam válidos. |
| Despesas maiores que receita | Lucro e indicadores de lucro ficam negativos; não limitar a zero. |
| Receita zero | Margem “—”; lucro continua sendo receita menos despesas. |
| R$ 0,10 e R$ 0,20 em ganhos | Receita exatamente R$ 0,30, sem artefato monetário. |
| Corridas fracionárias ou qualquer número negativo de entrada | Impedir gravação com erro por campo. |
| Ganho com zero corridas, horas ou km | Aceitar zeros explícitos; não confundir zero com campo ausente. |
| Data inexistente, futura ou vazia | Impedir gravação e orientar correção. |
| Virada de dia, mês, ano ou semana | Aplicar o calendário e fuso definidos em RN-006, inclusive ano bissexto. |
| Edição de lançamento movendo-o para fora do filtro | Remover sua contribuição do período anterior e incluir no novo. |
| Registro removido em outra aba antes de editar/excluir | Informar indisponibilidade e atualizar a lista; não recriar o registro. |
| Duplo toque em Salvar enquanto aguarda resposta | Desabilitar novo envio nessa operação; uma gravação por envio aceito. |
| Resposta perdida após envio | Não afirmar sucesso nem repetir automaticamente; orientar consulta da lista antes de reenviar. |
| Falha de gravação confirmada | Manter dados não sensíveis preenchidos e permitir correção ou nova tentativa. |
| Sessão expirada ao enviar formulário | Não executar ação sem autorização; solicitar login e informar que a gravação não foi confirmada. |
| Tentativa de consultar/alterar identificador alheio | Não revelar conteúdo, existência ou propriedade do registro. |
| Duas tentativas simultâneas de cadastrar veículo | No máximo uma é aceita; a outra informa que já existe veículo. |
| Link de recuperação exatamente no vencimento | Considerar expirado; senha permanece inalterada. |
| Texto extenso em nome, marca, modelo ou descrição | Respeitar limites e quebrar texto na tela sem gerar rolagem horizontal. |

## Requirements *(mandatory)*

### Functional Requirements

Cada requisito inclui uma condição observável de aceite. Os cenários anteriores e as
regras seguintes detalham os casos positivos, negativos e os valores esperados.

| ID | Requisito e critério de aceite |
|----|-------------------------------|
| FR-001 | O sistema DEVE cadastrar usuário com nome, e-mail único e senha; dados válidos permitem login posterior, inválidos não criam conta (US1). |
| FR-002 | O sistema DEVE permitir login por e-mail e senha e manter acesso enquanto a sessão puder ser renovada validamente; credenciais inválidas não dão acesso (US1). |
| FR-003 | O sistema DEVE encerrar a sessão no logout; reutilizá-la ou voltar pelo navegador não permite reabrir dados protegidos (US1). |
| FR-004 | O sistema DEVE recuperar senha por link enviado ao e-mail cadastrado, com validade de 30 minutos e uso único; redefinição invalida links pendentes e sessões anteriores (US2). |
| FR-005 | O sistema DEVE proteger senha e informações sensíveis; telas e mensagens de falha não exibem senha, credenciais internas ou detalhes de execução (US1, US2). |
| FR-006 | O sistema DEVE autorizar cada consulta e alteração com base no usuário autenticado; nenhuma ação, mesmo tentada fora da interface, acessa dados alheios (US1 e casos de borda). |
| FR-007 | O sistema DEVE cadastrar e consultar no máximo um veículo por usuário com os cinco campos definidos; placa vazia é aceita e segundo cadastro é rejeitado (US3). |
| FR-008 | O perfil DEVE exibir nome e e-mail próprios, sem incluir senha, foto, configurações ou edição cadastral (US3). |
| FR-009 | O sistema DEVE criar ganhos com os seis campos obrigatórios e plataformas definidas em RN-002; dados válidos reaparecem após recarregar (US4). |
| FR-010 | O sistema DEVE listar e permitir consultar todos os ganhos próprios, ordenados por data decrescente, com acesso aos seis campos (US4). |
| FR-011 | O sistema DEVE editar os seis campos e excluir ganhos próprios após confirmação simples; cancelar não altera o registro (US4). |
| FR-012 | O sistema DEVE criar despesas com data, categoria e valor obrigatórios e descrição opcional; a criação usa um único formulário (US5). |
| FR-013 | O sistema DEVE listar e permitir consultar todas as despesas próprias, ordenadas por data decrescente, com acesso aos quatro campos (US5). |
| FR-014 | O sistema DEVE editar os quatro campos e excluir despesas próprias após confirmação simples; cancelar preserva o registro (US5). |
| FR-015 | O sistema DEVE validar campos conforme RN-001 a RN-005 antes de aceitar gravações; erros não causam salvamento parcial (US1–US5). |
| FR-016 | O dashboard DEVE exibir receita total, despesas totais, lucro líquido, margem, receita/hora, lucro/hora, receita/km e lucro/km conforme RN-007 e RN-008 (US6). |
| FR-017 | O dashboard DEVE mostrar graficamente receita por aplicativo, gastos por categoria e evolução diária de receita, despesas e lucro, com rótulos e valores consultáveis também por toque (US6). |
| FR-018 | O dashboard DEVE apresentar os cinco últimos lançamentos do período, combinando ganhos e despesas; cada item mostra data, tipo, plataforma/categoria e valor (US6). |
| FR-019 | O dashboard DEVE oferecer Hoje, Semana e Mês, iniciar em Mês e exibir os limites de datas; mudar o filtro atualiza todos os componentes conjuntamente (US6). |
| FR-020 | O sistema DEVE refletir gravações confirmadas nas listagens e na próxima consulta do dashboard, sem reiniciar a sessão (US4–US6). |
| FR-021 | A interface DEVE comunicar carregamento, sucesso, validação, falha e vazio conforme a tabela de estados; não exibir dados antigos como resultado do novo filtro. |
| FR-022 | Todos os fluxos principais DEVEM ser utilizáveis em mobile e desktop, sem cortes de campos, ações inacessíveis ou rolagem horizontal evitável; gráficos não dependem apenas de passar o mouse. |
| FR-023 | Ganhos e despesas DEVEM usar formulários únicos e focados, sem assistentes ou cadeias de modais; a despesa exige somente valor, categoria e data, além do comando Salvar. |

### Regras de negócio

**RN-001 — Conta e perfil.** Nome é obrigatório, de 1 a 100 caracteres após remover espaços
externos. E-mail deve ter formato válido, no máximo 254 caracteres e ser único sem
sensibilidade a maiúsculas ou espaços externos. Senha tem de 8 a 128 caracteres, permite
espaços e não é truncada nem tem espaços removidos silenciosamente. Nome/e-mail são os
únicos dados do perfil consultável. O cadastro não exige telefone, documento ou endereço.

**RN-002 — Ganhos.** Cada registro representa um total manual de atividade em uma data e
plataforma, não cada corrida. Data, plataforma, valor, corridas, horas e km são obrigatórios.
Plataformas fixas: **Uber, 99, inDrive, Particular e Outro**. Outro não exige texto extra.
Valor deve ser positivo e possuir até duas casas decimais. Corridas são um inteiro maior
ou igual a zero. Horas e km são maiores ou iguais a zero, com até duas casas decimais;
horas são informadas em formato decimal (1,50 = uma hora e meia). Cada ganho admite até
24 horas; não há validação de sobreposição entre plataformas. Podem existir vários ganhos
na mesma data/plataforma. O usuário deve evitar repetir horas e km da mesma atividade em
mais de um registro: esses campos representam parcelas que serão somadas.

**RN-003 — Despesas.** Data, categoria e valor positivo com até duas casas decimais são
obrigatórios. Descrição opcional de até 500 caracteres. Categorias fixas: **Combustível,
Manutenção, Seguro, Lavagem, Pedágio, Estacionamento, Alimentação, Financiamento e Outros**.
Outros não obriga descrição. Despesas são valores pagos registrados manualmente; não há
parcelamento, previsão, depreciação, recorrência ou rateio automático.

**RN-004 — Veículo.** Marca e modelo são textos obrigatórios de 1 a 100 caracteres após
remover espaços externos. Ano é inteiro entre 1900 e o ano corrente mais um. Combustível
é uma seleção obrigatória entre Gasolina, Etanol, Flex, Diesel, GNV, Elétrico, Híbrido e
Outro. Placa é texto opcional de até 10 caracteres; não exige consulta externa. Um usuário
pode ter zero ou um veículo cadastrado; ausência de veículo não impede operações
financeiras. Os lançamentos pertencem ao usuário e não criam histórico de veículos.

**RN-005 — Valores e datas.** Datas de ganhos/despesas são datas de calendário válidas,
sem horário, até hoje no fuso do produto; a data inicial do formulário é hoje e pode ser
alterada para dias anteriores. Valores monetários são reais brasileiros, exibidos com
duas casas decimais. Quantidades, horas e km não aceitam texto não numérico nem negativos.
Campos decimais aceitam vírgula decimal; excesso de casas deve gerar validação, não corte
silencioso. Campos obrigatórios vazios não são convertidos em zero.

**RN-006 — Períodos e ordenação.** O produto usa o calendário e fuso America/Sao_Paulo.
Hoje inclui somente a data atual. Semana inclui segunda-feira até domingo da semana
atual. Mês inclui o primeiro até o último dia do mês atual. Limites são inclusivos e usam
a data do lançamento, não a data de criação. Por não aceitar lançamentos futuros, os dias
futuros do período não têm registros. Na evolução, mostrar dias até hoje e preencher dias
anteriores sem movimento com zero. Últimos lançamentos são ordenados pela data decrescente,
desempatados pelo momento de criação decrescente e, se ainda necessário, por identificador
estável. Listagens de ganhos e despesas usam o mesmo desempate e não ocultam registros
antigos permanentemente; a forma de navegação pela lista pertence ao planejamento.

**RN-007 — Fonte dos totais.** Para o usuário e período selecionados, Receita é a soma dos
valores dos ganhos; Despesas é a soma dos valores das despesas; Horas e Km são as somas
respectivas dos ganhos. Todas as telas devem apresentar resultados consistentes para os
mesmos dados. Os resultados são baseados exclusivamente nos lançamentos informados, sem
estimar impostos, taxas das plataformas ou custos não cadastrados.

| Indicador | Regra |
|-----------|-------|
| Lucro líquido | Receita − Despesas |
| Margem de lucro | (Lucro / Receita) × 100 |
| Receita por hora | Receita / Horas |
| Lucro por hora | Lucro / Horas |
| Receita por km | Receita / Km |
| Lucro por km | Lucro / Km |
| Receita por aplicativo | Soma dos ganhos de cada plataforma no período |
| Gastos por categoria | Soma das despesas de cada categoria no período |
| Evolução financeira | Receita, despesas e lucro agregados por dia no período |

**RN-008 — Precisão e ausência de denominador.** Somar valores exatos antes de calcular
razões; não calcular média das razões dos lançamentos. Arredondar apenas o resultado de
exibição para duas casas, com empate na terceira casa afastando de zero. Margem é exibida
com duas casas e símbolo %. Para denominador zero, exibir “—” acompanhado de explicação
“Sem receita”, “Sem horas registradas” ou “Sem km registrados”, conforme o indicador.
Totais vazios são R$ 0,00. Lucro e razões negativos são válidos. Nunca apresentar NaN,
Infinity ou valores monetários inválidos. Distribuições sem movimentos têm estado vazio;
com movimentos, podem omitir grupos zerados e devem totalizar os respectivos indicadores.

**RN-009 — Consistência das alterações.** Cada gravação aceita salva integralmente um
registro. Edição substitui os campos anteriores sem duplicar a contribuição financeira;
exclusão retira toda a contribuição. Confirmação de exclusão identifica o lançamento.
O aplicativo impede novo envio enquanto o anterior está pendente, mas não elimina ganhos
ou despesas legitimamente iguais. Em resposta incerta, não repete gravações automaticamente.

### Estados e comportamentos esperados

| Estado | Comportamento e critério de aceite |
|--------|-----------------------------------|
| Carregamento inicial | Informar que os dados estão sendo carregados; não apresentar zeros como se já fossem o resultado confirmado. |
| Troca de filtro | Identificar o período solicitado e sinalizar atualização; todos os componentes apresentados como atuais devem pertencer a esse período. |
| Salvando | Indicar andamento e impedir repetição de Salvar até a resposta. |
| Sucesso | Confirmar a operação e mostrar o registro atualizado ou sua remoção na lista. |
| Validação | Associar mensagem clara ao campo, preservar os demais valores não sensíveis e impedir gravação parcial. |
| Falha de consulta | Explicar que os dados não foram carregados e oferecer nova tentativa, sem simular estado vazio. |
| Falha confirmada de gravação | Informar que não foi salvo; preservar valores não sensíveis para tentar novamente. |
| Resultado de gravação incerto | Informar que não foi possível confirmar; orientar consultar a lista antes de reenviar, sem anunciar sucesso ou duplicar automaticamente. |
| Lista vazia | Explicar a ausência de ganhos/despesas e apresentar acesso ao cadastro correspondente. |
| Dashboard vazio | Manter filtros e métricas conforme RN-008; explicar que não há lançamentos no período. |
| Sessão sem possibilidade de renovação | Encaminhar ao login e explicar a necessidade de entrar novamente; não executar operação protegida. |
| Registro indisponível | Usar mensagem genérica sem expor dados de terceiros; permitir retornar à lista. |

### Key Entities *(include if feature involves data)*

- **Usuário**: identidade com nome, e-mail e credencial protegida; proprietário dos dados.
- **Veículo**: marca, modelo, ano, combustível e placa opcional; pertence a um usuário,
  limitado a um cadastro por proprietário.
- **Ganho**: data, plataforma, valor, corridas, horas e km; pertence a um usuário.
- **Despesa**: data, categoria, valor e descrição opcional; pertence a um usuário.
- **Plataforma**: uma das cinco opções comuns a todos os usuários; não editável na V1.
- **Categoria de despesa**: uma das nove opções comuns; não editável na V1.

Sessão e recuperação representam o controle de acesso, sem ampliar os dados de domínio
ou determinar aqui estruturas de armazenamento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Todos os cenários de aceite das seis histórias passam antes da publicação,
  incluindo consulta do perfil, recuperação, operações de ganhos/despesas e veículo único.
- **SC-002**: Em teste manual com usuário familiarizado com os campos, cadastrar uma
  despesa leva até 30 segundos e um ganho até 60 segundos, do formulário aberto à
  confirmação, com dados à mão e conexão funcional, sem ajuda ou etapas adicionais.
- **SC-003**: Todos os valores do exemplo financeiro de US6 e dos casos de denominador
  zero, prejuízo e precisão correspondem exatamente aos resultados especificados.
- **SC-004**: Os 12 componentes do dashboard respeitam cada um dos três filtros em 100%
  dos cenários preparados, incluindo limites de período e registros de outro usuário.
- **SC-005**: Nenhuma tentativa de leitura ou alteração de dados alheios dos cenários de
  teste tem sucesso, tanto por navegação quanto por tentativa direta fora da interface.
- **SC-006**: Todas as jornadas são concluídas em larguras de 360, 390 e 768 pixels e em
  desktop de 1366 pixels, sem rolagem horizontal da página, campos cortados ou ações inacessíveis.
- **SC-007**: Cada estado da tabela possui validação reproduzível; falhas de consulta,
  gravação e sessão não são confundidas com sucesso ou ausência de lançamentos.
- **SC-008**: Na versão publicada, um usuário consegue criar conta, entrar, recuperar
  senha, cadastrar veículo, consultar perfil, operar ganhos/despesas, consultar dashboard
  e sair pela URL pública, seguindo apenas as instruções do produto.
- **SC-009**: O README final permite executar o produto seguindo suas instruções e contém
  todos os itens constitucionais, screenshots reais e link público funcional.

## Assumptions

As premissas abaixo completam detalhes não definidos no pedido; não representam novas
capacidades. Podem ser refinadas antes do plano, preservando o menor escopo da V1.

- Idioma português do Brasil, moeda BRL e um único fuso de referência (America/Sao_Paulo),
  sem preferências regionais por usuário.
- Perfil significa consulta de nome e e-mail; cadastro de veículo significa criar e
  consultar. Edição/exclusão permanecem restritas aos ganhos e despesas solicitados.
- Cadastro usa nome, e-mail e senha; ao concluir, oferece login em vez de exigir onboarding.
- Recuperação depende de acesso à caixa de e-mail e de entrega de mensagens transacionais
  funcionando em produção. Link expira em 30 minutos e não há confirmação de e-mail separada.
- Há conexão para consultar e salvar; operação offline e sincronização não pertencem à V1.
- Semana começa na segunda-feira, o dashboard inicia no mês corrente e os cinco últimos
  lançamentos seguem a data financeira. São padrões fixos, não configurações extras.
- Ganhos representam entradas recebidas e despesas valores pagos. Não há lançamentos
  futuros, estornos negativos ou previsão financeira. Correções usam edição/exclusão.
- Zeros explícitos em corridas/horas/km são aceitos para não obrigar dados inventados;
  divisão sem denominador é apresentada como não disponível, conforme RN-008.
- Limites de campos, combustíveis, ano do veículo e arredondamento seguem RN-001 a RN-008
  como padrões verificáveis da V1, sem serviços externos de consulta.
- Publicação depende de ambientes funcionais e configuração de acesso e recuperação;
  detalhes técnicos, testes e sequência de execução serão definidos no plano e nas tarefas.

## Definition of Done Aplicável *(mandatory)*

A conclusão exige todas as capacidades e critérios deste documento integrados, os testes
automatizados de cálculos e regras críticas previstos na constituição, isolamento de
dados verificado e validação manual dos fluxos principais em mobile e desktop.

A V1 exige publicação dos componentes do produto e do banco, configuração válida de
produção, URL pública funcional, repositório disponível no GitHub e documentação fiel,
com problema, solução, screenshots, funcionalidades, stack, arquitetura, execução local,
decisões técnicas, link público, melhorias futuras e o aviso constitucional de portfólio.
O fluxo deve chegar à apresentação no portfólio e à conclusão, sem antecipar esse status.

A lista normativa de conclusão é o princípio XVI da constituição, complementada pelos
demais princípios e por esta especificação. Evidências serão registradas durante a
implementação e publicação; a validação documental não afirma que o produto já funciona.
O checklist de qualidade desta especificação está em [requirements.md](checklists/requirements.md).
