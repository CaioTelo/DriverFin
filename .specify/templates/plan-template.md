# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.agents/skills/speckit-plan/SKILL.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript; [versões compatíveis de Node.js e ferramentas a definir]

**Primary Dependencies**: Next.js, React, Tailwind CSS, shadcn/ui, Recharts, Prisma; [NestJS ou Fastify]

**Storage**: PostgreSQL; migrations Prisma versionadas

**Testing**: [ferramentas a definir; automação de regras críticas e validação manual responsiva]

**Target Platform**: Web responsiva mobile first e desktop

**Project Type**: Aplicação web cliente-servidor com REST API

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: Escopo fechado da V1, infraestrutura simples e de baixo custo

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Referência obrigatória: `.specify/memory/constitution.md` (DriverFin).
Registrar evidência ou justificativa de não aplicabilidade para cada gate:

- [ ] Escopo: atende requisito do MVP (VII); mudanças classificadas conforme XVII;
  melhorias adiadas e novas capacidades registradas no Backlog V2.
- [ ] Arquitetura: Next.js → REST API → Node.js → PostgreSQL; stack conforme IV;
  escolha NestJS/Fastify e serviços de deploy justificada pela entrega da V1.
- [ ] Simplicidade: sem infraestrutura especulativa; exceções técnicas previstas em IV
  documentadas; conflitos sem exceção exigem alteração formal da constituição.
- [ ] Dados: modelo enxuto, um veículo por usuário, restrições claras e migrations
  Prisma versionadas; cada tabela adicional tem necessidade concreta de domínio.
- [ ] Finanças: fonte de verdade, representação monetária precisa, arredondamento e
  comportamento de divisões por zero definidos sem NaN ou Infinity.
- [ ] Segurança: hash seguro, JWT/refresh token, autorização e isolamento no servidor,
  segredos por ambiente e erros sem exposição de detalhes sensíveis.
- [ ] UX: formulários curtos, mobile first e desktop; estados de carregamento,
  sucesso, validação, falha e vazio; backend como validação autoritativa.
- [ ] Entrega incremental: concluir a funcionalidade atual antes de abrir novas áreas;
  tarefas pequenas de modelo/contrato, backend, frontend, validação, testes e integração.
- [ ] Qualidade: testes automatizados de cálculos e regras críticas do backend;
  verificação manual dos fluxos principais em mobile e desktop antes da publicação.
- [ ] Conclusão: DoD aplicável, frontend/backend/banco publicados, URL validada e
  README fiel com screenshots e aviso de portfólio; melhorias não bloqueiam publicação.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# Estrutura ilustrativa: ajustar ao plano sem criar camadas especulativas.
backend/
├── src/
└── tests/

frontend/
├── src/
└── tests/

# Definir no plano a localização do schema e das migrations Prisma.
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> Preencher para desvios intencionais. Justificativas não substituem alteração formal
> quando a regra constitucional não prevê exceção.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
