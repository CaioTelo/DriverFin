---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testes automatizados são OBRIGATÓRIOS para cálculos financeiros e regras críticas do backend (constituição XI), mesmo sem solicitação adicional na spec. Incluir verificação manual dos fluxos principais em mobile e desktop antes da publicação. Outros testes devem ser proporcionais ao risco.

**Organization**: Agrupar por história, com tarefas pequenas e sequenciais até sua integração e DoD. Respeitar o escopo fechado da V1; adiar melhorias e registrar novas capacidades no Backlog V2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below are illustrative - use the concrete TypeScript paths from plan.md

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Criar schema mínimo e migrations Prisma versionadas, com restrições de domínio
- [ ] T005 [P] Implementar hash seguro, JWT/refresh token e autorização com isolamento no backend
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T008 Configure error handling and logging infrastructure
- [ ] T009 Setup environment configuration management

**Checkpoint**: Foundation ready - iniciar a história de maior prioridade e levá-la à conclusão

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 Primeiro incremento da V1

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (obrigatórios para regras críticas; demais conforme risco) ⚠️

> Definir cenários a partir dos requisitos e executar os testes antes de concluir a história.
> A constituição exige automação crítica, sem impor TDD a toda tarefa.

- [ ] T010 [P] [US1] Contract test for [endpoint] in tests/contract/test_[name].ts
- [ ] T011 [P] [US1] Integration test for [user journey] in tests/integration/test_[name].ts

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create [Entity1] model in src/models/[entity1].ts
- [ ] T013 [P] [US1] Create [Entity2] model in src/models/[entity2].ts
- [ ] T014 [US1] Implement [Service] in src/services/[service].ts (depends on T012, T013)
- [ ] T015 [US1] Implement [endpoint/feature] in src/[location]/[file].ts
- [ ] T016 [US1] Add validation and error handling
- [ ] T017 [US1] Add logging for user story 1 operations

**Checkpoint**: História integrada, testes críticos aprovados e fluxos mobile/desktop verificados; atender à DoD aplicável antes da próxima história.

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (obrigatórios para regras críticas; demais conforme risco) ⚠️

- [ ] T018 [P] [US2] Contract test for [endpoint] in tests/contract/test_[name].ts
- [ ] T019 [P] [US2] Integration test for [user journey] in tests/integration/test_[name].ts

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create [Entity] model in src/models/[entity].ts
- [ ] T021 [US2] Implement [Service] in src/services/[service].ts
- [ ] T022 [US2] Implement [endpoint/feature] in src/[location]/[file].ts
- [ ] T023 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (obrigatórios para regras críticas; demais conforme risco) ⚠️

- [ ] T024 [P] [US3] Contract test for [endpoint] in tests/contract/test_[name].ts
- [ ] T025 [P] [US3] Integration test for [user journey] in tests/integration/test_[name].ts

### Implementation for User Story 3

- [ ] T026 [P] [US3] Create [Entity] model in src/models/[entity].ts
- [ ] T027 [US3] Implement [Service] in src/services/[service].ts
- [ ] T028 [US3] Implement [endpoint/feature] in src/[location]/[file].ts

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Validação, Deploy e Documentação

**Purpose**: Concluir e publicar a V1 com evidências; melhorias não necessárias ficam adiadas.

Gerar tarefas concretas com IDs únicos e caminhos reais conforme o plano. Para uma
feature incremental, incluir os impactos aplicáveis; para a entrega da V1, cobrir tudo:

- [ ] TXXX Validar testes de autenticação, isolamento entre usuários e CRUD de ganhos/despesas
- [ ] TXXX Validar testes de cálculos, agregações do dashboard e divisão por zero
- [ ] TXXX Verificar manualmente fluxos principais mobile/desktop, gráficos e estados da UI
- [ ] TXXX Validar migrations versionadas e configuração de produção sem segredos no Git
- [ ] TXXX Publicar frontend e backend, hospedar PostgreSQL e validar URL e fluxos em produção
- [ ] TXXX Atualizar readme.md: problema, solução, screenshots, funcionalidades reais, stack,
  arquitetura, execução local, decisões, link público, melhorias futuras e aviso obrigatório
- [ ] TXXX Executar as instruções locais do quickstart.md e readme.md
- [ ] TXXX Verificar disponibilidade no GitHub e apresentação no portfólio
- [ ] TXXX Conferir capacidades do princípio VII e DoD do XVI antes de declarar V1 concluída

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Executar em prioridade (P1 → P2 → P3), concluindo e integrando a história atual
  - Limitar áreas simultâneas; [P] indica independência técnica, não obrigação de paralelismo
- **Validação, Deploy e Documentação (Final Phase)**: Depende das histórias obrigatórias; não aguarda melhorias opcionais

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Requisito antes do modelo de dados e contrato da API
- Modelo/contrato antes do backend; backend antes do frontend
- Incluir frontend e estados da interface em cada história com interação do usuário
- Validação e testes antes da integração e conclusão
- História concluída conforme DoD antes da próxima prioridade

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Após a fundação, priorizar a conclusão de uma história; limitar trabalho simultâneo
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Paralelismo não deve abrir múltiplas áreas inacabadas nem atrasar a integração atual

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (conforme risco e obrigatoriedade constitucional):
Task: "Contract test for [endpoint] in tests/contract/test_[name].ts"
Task: "Integration test for [user journey] in tests/integration/test_[name].ts"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].ts"
Task: "Create [Entity2] model in src/models/[entity2].ts"
```

---

## Implementation Strategy

### Primeiro Incremento (não equivale à conclusão da V1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (incremento da V1)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Trabalho Simultâneo Limitado

1. Concluir apenas a fundação necessária à história atual.
2. Distribuir tarefas independentes dentro dessa história quando isso ajudar a concluí-la.
3. Integrar e validar antes de abrir novas áreas; preferir a menor tarefa até a conclusão.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verificar testes críticos e validação manual antes de declarar conclusão
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
