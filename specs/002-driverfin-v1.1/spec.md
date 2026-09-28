# Feature Specification: DriverFin V1.1

**Feature Branch**: `002-driverfin-v1.1`

**Created**: 2026-09-28

**Status**: Approved for implementation

**Input**: Adicionar visão anual ao Dashboard e tornar silenciosa a revalidação de uma sessão já autenticada.

## V1 Scope & Constitution Alignment

- **Requisito do MVP**: aprimora o Dashboard e corrige a continuidade do fluxo autenticado já exigidos pelos princípios VII, VIII e XIII.
- **Classificação**: melhoria corretiva pequena da V1, sem novo domínio, infraestrutura ou dependência.
- **Necessária para colocar a V1 no ar?**: sim; evita desmontar a área privada durante revalidações normais e oferece a leitura anual solicitada para o resumo financeiro.
- **Fora do escopo**: períodos personalizados, anos anteriores, novos modelos, migrations, notificações globais e alterações no contrato público do contexto de autenticação.
- **Backlog V2**: seleção de ano, comparação entre anos e períodos personalizados permanecem adiados.

## User Scenarios & Testing

### User Story 1 - Consultar o ano corrente (Priority: P1)

Como motorista autenticado, quero selecionar Ano no Dashboard para enxergar os totais do ano corrente e a evolução de janeiro a dezembro.

**Why this priority**: a leitura anual amplia diretamente a utilidade do núcleo financeiro sem criar outro fluxo ou fonte de cálculo.

**Independent Test**: selecionar Ano em um Dashboard com lançamentos distribuídos no ano e confirmar intervalo, indicadores e exatamente doze pontos mensais.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com lançamentos no ano corrente, **When** seleciona Ano, **Then** o período exibido vai de 01/01 a 31/12 no fuso de São Paulo e os totais consideram somente esse intervalo.
2. **Given** um ano ainda em andamento, **When** a evolução anual é exibida, **Then** existem exatamente doze pontos de janeiro a dezembro e meses futuros têm valores zero.
3. **Given** lançamentos em vários dias do mesmo mês, **When** a evolução anual é calculada, **Then** os valores monetários exatos são somados em um ponto cuja data é `YYYY-MM-01`.
4. **Given** qualquer filtro existente, **When** Hoje, Semana ou Mês é selecionado, **Then** a evolução continua diária e o filtro inicial continua Mês.

---

### User Story 2 - Permanecer na tela durante revalidação (Priority: P1)

Como usuário autenticado, quero continuar vendo e usando a tela atual enquanto a sessão é revalidada ao retornar à aba, sem um flash de inicialização.

**Why this priority**: desmontar a aplicação em toda retomada prejudica diretamente todos os fluxos privados e confunde revalidação normal com carregamento inicial.

**Independent Test**: atrasar a revalidação após foco e confirmar que a tela e o snapshot atual permanecem visíveis; em seguida testar sucesso, falha de rede e 401.

**Acceptance Scenarios**:

1. **Given** uma sessão já autenticada, **When** uma revalidação por foco, visibilidade ou `pageshow` fica pendente, **Then** usuário, shell privado e tela atual permanecem montados.
2. **Given** uma sessão autenticada, **When** a revalidação em background falha por rede, **Then** a sessão visual e os dados atuais permanecem sem aviso global.
3. **Given** uma sessão autenticada, **When** a revalidação recebe 401, **Then** a sessão é limpa e o usuário volta ao login.
4. **Given** a primeira validação da aplicação, **When** ela está pendente ou falha, **Then** os estados globais atuais de inicialização ou indisponibilidade continuam sendo usados.
5. **Given** login ou logout concorrente com uma revalidação antiga, **When** a resposta antiga chega depois, **Then** ela não sobrescreve a operação mais recente.

### Edge Cases

- A virada local de 31/12 para 01/01 deve selecionar o novo ano no fuso `America/Sao_Paulo`.
- Totais anuais devem excluir lançamentos de outros anos e preservar isolamento por usuário.
- Divisões por zero continuam retornando o estado seguro existente, sem `NaN` ou `Infinity`.
- Um ano sem lançamentos ainda retorna doze pontos zerados.
- Falhas transitórias ao atualizar o Dashboard por foco preservam o snapshot; somente uma resposta bem-sucedida e atual pode substituí-lo.
- Respostas obsoletas de Dashboard, autenticação, login ou logout não podem vencer a requisição/operação mais recente.

## Requirements

### Functional Requirements

- **FR-001**: O sistema DEVE aceitar `year` em `GET /api/dashboard?period=` e nos tipos de transporte web, sem adicionar propriedades à resposta.
- **FR-002**: `year` DEVE representar 01/01 a 31/12 do ano corrente em `America/Sao_Paulo`, com `seriesEndDate` igual a `endDate`.
- **FR-003**: A evolução anual DEVE conter exatamente doze pontos mensais, ordenados, usando `YYYY-MM-01` em `date` e zero para meses sem movimentos, inclusive futuros.
- **FR-004**: A agregação mensal DEVE reutilizar os grupos financeiros atuais e conservar precisão monetária exata.
- **FR-005**: Hoje, Semana e Mês DEVEM manter semântica diária; Mês DEVE continuar sendo o filtro padrão.
- **FR-006**: A interface DEVE oferecer os quatro filtros em layout responsivo e rotular eixo, tooltip e tabela acessível da evolução anual com Jan–Dez.
- **FR-007**: Somente a validação inicial DEVE usar `initializing`; revalidações de sessão já autenticada DEVEM ocorrer em background sem desmontar a área privada.
- **FR-008**: Falha de transporte em revalidação autenticada DEVE preservar usuário e estado visual, sem aviso global; 401 DEVE limpar a sessão.
- **FR-009**: O Dashboard DEVE preservar o snapshot durante atualização por foco/visibilidade e substituí-lo somente após sucesso da requisição atual.
- **FR-010**: `operationVersion` e `credentialVersion` DEVEM continuar impedindo respostas obsoletas de alterar estado atual.

### Key Entities

Nenhuma entidade persistida nova. `DashboardPeriod` ganha o valor `year`; para esse valor, os itens existentes de `evolution` representam meses pelo primeiro dia de cada mês.

## Success Criteria

### Measurable Outcomes

- **SC-001**: O filtro Ano retorna e renderiza exatamente doze meses em todos os estados, com totais iguais à soma exata dos lançamentos do ano corrente.
- **SC-002**: Os três filtros existentes continuam aprovados nos testes automatizados sem alteração de resultados.
- **SC-003**: Durante revalidação lenta em uma sessão autenticada, 100% do shell e do conteúdo atual permanecem visíveis até a conclusão.
- **SC-004**: Rede indisponível preserva a tela autenticada e 401 redireciona ao login nos cenários automatizados.
- **SC-005**: Os fluxos funcionam sem rolagem horizontal evitável em 360, 390, 768 e 1366 px.

## Assumptions

- O ano consultado é sempre o ano corrente; não haverá seletor de ano.
- O contrato existente, banco e dependências são suficientes.
- A cópia “Verificando sua sessão…” permanece apenas no carregamento inicial.

## Definition of Done Aplicável

- [ ] Critérios de aceitação atendidos e funcionalidade integrada ao produto.
- [ ] Cálculos financeiros e calendário cobertos por testes automatizados.
- [ ] Isolamento, precisão, divisão por zero e regressão dos filtros verificados.
- [ ] Fluxos verificados manualmente em 360, 390, 768 e 1366 px.
- [ ] Estados de inicialização, background, rede e 401 verificados.
- [ ] Sem migration, nova variável de ambiente ou dependência.
- [ ] README atualizado com os quatro filtros implementados.
- [ ] API e web publicadas e smoke de produção aprovado.
