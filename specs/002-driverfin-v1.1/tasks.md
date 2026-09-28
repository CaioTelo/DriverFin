# Tasks: DriverFin V1.1

**Input**: `specs/002-driverfin-v1.1/spec.md`, `specs/001-driverfin-v1/plan.md` e constituição vigente.

**Tests**: calendário, agregações financeiras e concorrência de autenticação exigem automação; fluxos principais também exigem validação responsiva manual.

## Phase 1: Baseline

- [X] T001 Registrar e executar o baseline focado dos testes atuais de calendário, Dashboard e autenticação.

## Phase 2: User Story 1 - Filtro anual do Dashboard (P1)

- [X] T002 [US1] Acrescentar testes unitários de limites anuais, ano em andamento e virada de ano em `apps/api/src/common/calendar/calendar.spec.ts`.
- [X] T003 [US1] Estender o calendário com `year`, produzindo 01/01–31/12 e série completa em `apps/api/src/common/calendar/calendar.ts`.
- [X] T004 [US1] Estender o DTO da API e os tipos de transporte web com `year` em `apps/api/src/dashboard/dto/dashboard-query.dto.ts` e `apps/web/src/lib/api-client.ts`.
- [X] T005 [US1] Adicionar testes de integração para totais anuais, exclusão de outros anos, divisão por zero, doze meses e regressão dos filtros existentes em `apps/api/test/integration/dashboard.spec.ts`.
- [X] T006 [US1] Reutilizar as consultas atuais e agregar os grupos diários em doze pontos mensais exatos em `apps/api/src/dashboard/dashboard.service.ts`.
- [X] T007 [US1] Adicionar o botão Ano, preservar Mês como padrão e ajustar o grid responsivo para quatro filtros em `apps/web/src/features/dashboard/dashboard-view.tsx` e `apps/web/src/app/globals.css`.
- [X] T008 [US1] Adaptar gráfico, tooltip e tabela acessível para rótulos Jan–Dez em `apps/web/src/features/dashboard/dashboard-charts.tsx`.
- [X] T009 [US1] Cobrir filtro Ano, intervalo exibido, doze meses e os 12 componentes atuais em `apps/web/tests/e2e/dashboard.spec.ts`.

## Phase 3: User Story 2 - Revalidação autenticada em background (P1)

- [X] T010 [US2] Atualizar E2E para validação inicial, retorno à aba, sessão expirada, rede, corrida com login e logout em `apps/web/tests/e2e/auth.spec.ts`.
- [X] T011 [US2] Separar revalidação inicial de revalidação em background no `apps/web/src/features/auth/auth-provider.tsx`, preservando versionamentos de operação e credencial.
- [X] T012 [US2] Manter o snapshot do Dashboard durante atualização por foco em `apps/web/src/features/dashboard/dashboard-view.tsx`; substituir dados somente após sucesso e preservar a tela em falha transitória.

## Phase 4: Fechamento

- [X] T013 Atualizar `README.md` somente após a implementação, registrando os quatro filtros reais.
- [X] T014 Executar formatação, lint, typecheck, unitários, integração, E2E e build.
- [ ] T015 Validar manualmente em 360, 390, 768 e 1366 px, incluindo troca de aba, rede e sessão expirada.
- [ ] T016 Publicar API e web e executar smoke de produção do filtro anual e da revalidação.

## Dependencies & Execution Order

- T001 antecede mudanças funcionais.
- US1 segue TDD na ordem T002–T006 e então integra UI/E2E em T007–T009.
- US2 segue T010–T012, mantendo as proteções de concorrência existentes.
- T013–T016 dependem das duas histórias concluídas; publicação exige credenciais e provedores externos já autorizados.
- Tasks que alteram o mesmo arquivo são sequenciais.
