# Tasks: DriverFin V1

**Base normativa**: [constituição v1.0.0](../../.specify/memory/constitution.md), [spec.md](spec.md) e [plan.md](plan.md) aprovados.
**Design consultado**: [data-model.md](data-model.md), [contrato REST](contracts/rest-api.md), [research.md](research.md) e [quickstart.md](quickstart.md).
**Status**: roteiro de implementação; nenhuma tarefa ou validação executável está concluída.
**Organização**: 11 fases na ordem solicitada. US1/US2 (P1) compartilham a fase de autenticação; US3–US5 são P2 e US6 é P3. Todas são obrigatórias para a V1.

## Regras de execução

Prioridade: **concluir → fazer funcionar → testar → publicar → melhorar**. Cada checkbox representa uma unidade funcional com implementação e validação proporcionais; testes críticos acompanham a tarefa, sem microtarefas por arquivo, classe ou import.

Formato: `- [ ] TNNN [P?] [USn?] descrição`. Caminhos são relativos à raiz; diretórios indicam a área concreta de implementação. Executar sequencialmente por padrão: cada tarefa depende da anterior e cada fase depende do checkpoint anterior, salvo exceção explícita. Não há tarefas marcadas `[P]`: as unidades escolhidas compartilham integração, configuração ou critérios de aceite.

Antes de implementar cada unidade, ler os trechos referenciados dos artefatos aprovados e definir as asserções de aceite; executar testes junto da implementação. Usar Jest/Supertest com PostgreSQL real e Playwright conforme o plano, sem meta de cobertura. Registrar comandos, resultados, revisão validada e evidências manuais em `specs/001-driverfin-v1/checklists/validation.md`, criado na primeira validação e atualizado em cada checkpoint; nunca registrar segredos ou tokens. Só marcar uma tarefa após cumprir seu aceite.

O fechamento de uma fase significa incremento integrado e validado no ambiente disponível, não declaração de V1 concluída. Publicação, GitHub, README e DoD completa permanecem obrigatórios nas fases finais. Não iniciar despesas antes de ganhos funcionar, nem dashboard antes de ambos estarem integrados.

## Fase 1 — Fundação

**Objetivo**: aplicações independentes e ambiente reproduzível, com compatibilidade Node/Nest/Prisma/ESM verificada cedo.
**Aceite**: instalação pelo lockfile, banco local saudável, builds executáveis, transporte `/api` e CI básica funcionando.

- [ ] T001 Preparar monorepo privado com apenas `apps/web` e `apps/api` em `package.json`, `package-lock.json` e `.nvmrc`; fixar patches compatíveis das linhas Node 24, npm 11 e TypeScript 5.9 do plano, engines e scripts por workspace; validar instalação reproduzível sem Nx, Turborepo ou packages preventivos.
- [ ] T002 Preparar PostgreSQL 17 local com healthcheck, volume próprio e porta 5433 em `docker-compose.yml`, `.env.example`, `apps/api/.env.example` e `apps/web/.env.example`; documentar portas 3000/3001, DATABASE_URL, TEST_DATABASE_URL e variáveis do plano, proteger arquivos reais no `.gitignore` e verificar subida sem interferir em bancos de outros projetos.
- [ ] T003 Preparar API NestJS 11/Express com Prisma 7 e adapter-pg em `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma` e `apps/api/src/main.ts`; aplicar exatamente ESM do plano (`type: module`, NodeNext, decorators, generator esm/ts com imports js), configuração de ambiente e scripts do quickstart. Validar generate antes de build e execução de `dist/main.js`; o schema de domínio completo entra em T006.
- [ ] T004 Preparar Next.js 16/React 19/Tailwind 4 em `apps/web/src/app/`, `apps/web/package.json` e `apps/web/next.config.ts`; implementar rewrite fixo `/api/:path*` para API_ORIGIN preservando headers/cookies, sem lógica de domínio; disponibilizar `/api/health` em `apps/api/src/health.controller.ts` com prontidão de processo/banco e 503 sanitizado. Validar build web e chamada pela origem web, sem introduzir Prisma ou cálculos no frontend.
- [ ] T005 Fechar ferramentas e CI básica em `.github/workflows/ci.yml`, `package.json`, configurações locais de lint/typecheck dos workspaces e `apps/api/Dockerfile`; executar lint, typecheck e builds independentes/sequenciais com Node fixado. Validar imagem Node 24 Debian slim, runtime não-root, ESM preservado, config/schema/CLI disponíveis e build sem conexão ao banco; testar startup/health da imagem com banco local. Preparar Jest compatível com ESM para execução dos testes da fase seguinte.

**Checkpoint**: erros de compatibilidade e de transporte local corrigidos antes do domínio; não considerar apenas compilação como prova de startup.

## Fase 2 — Banco e domínio base

**Objetivo**: modelo mínimo, integridade e fronteiras de entrada compartilhadas prontas.
**Aceite**: banco vazio migrável, catálogos reproduzíveis, constraints verificadas no PostgreSQL e calendário/decimais testados.

- [ ] T006 Implementar os oito modelos User, Vehicle, Earning, Expense, Platform, ExpenseCategory, AuthSession e PasswordResetToken em `apps/api/prisma/schema.prisma` e `apps/api/prisma/migrations/`, exatamente conforme `data-model.md`: UUIDs/mapeamentos, relações/FKs, índices definidos, email canônico com unique e CHECK, veículo unique por userId, Fuel enum, Decimal(65,2), horas Decimal(4,2), Date e Timestamptz. Revisar CHECKs de limites/NaN e SQL gerado; não criar tabelas ou índices especulativos. Referências: RN-001–005, FR-006/007/015.
- [ ] T007 Completar migrations com os cinco Platform e nove ExpenseCategory de IDs/ordens fixos, seed idempotente em `apps/api/prisma/seed.ts` e conexão/ciclo de vida único em `apps/api/src/prisma/`; disponibilizar scripts db do quickstart. Criar harness protegido em `apps/api/test/integration/` que exige `driverfin_test`, recusa banco produtivo e aplica as mesmas migrations; testar migração em banco vazio, seed repetido, unicidade case-insensitive/veículo, FKs e constraints. Integrar essa suíte à `.github/workflows/ci.yml`.
- [ ] T008 Implementar calendário com relógio injetável e validação estrita em `apps/api/src/common/calendar/` e `apps/api/src/common/validation/`, com unitários próximos: datas reais não futuras em America/Sao_Paulo, ano corrente+1, intervalos inclusivos today/week/month e fim da série em hoje; strings decimais sem expoente, vazio, casas excedentes ou corte, faixas físicas antes de Decimal. Cobrir meia-noite SP, segunda/domingo, viradas de mês/ano e fevereiro bissexto. Referências: RN-004–006/008.
- [ ] T009 Implementar fronteiras REST em `apps/api/src/main.ts`, `apps/api/src/common/filters/` e `apps/api/src/common/validation/`: ValidationPipe restrito, rejeição de propriedades extras/userId, erro com fields/requestId e writeOutcome correto, serialização decimal/data, logs sanitizados, private/no-store, CORS/origem/JSON/X-DriverFin-Client conforme contrato e validação de env. Cobrir erro anterior à escrita, rollback confirmado versus unknown, GET sem writeOutcome e origem rejeitada em `apps/api/test/integration/`; preparar normalização vírgula→ponto e formatação sem parseFloat em `apps/web/src/lib/format.ts`. Referências: FR-005/006/015/021, RN-005/009.

**Checkpoint**: nenhum schema alternativo de teste, coerção vazio→zero ou perda de precisão; dados financeiros pertencem ao usuário, sem depender de veículo.

## Fase 3 — Autenticação completa (US1 e US2, P1)

**Objetivo**: fechar acesso, persistência de sessão, logout e recuperação antes da próxima área.
**Aceite US1**: duas contas independentes; cadastro/login/refresh/logout e consulta autenticada funcionam, sessão revogada não autoriza novas requisições.
**Aceite US2**: redefinir por link permite nova senha e invalida senha anterior, links pendentes e todas as sessões; senha inválida não consome link.

### US1 — Criar conta e controlar o acesso

- [ ] T010 [US1] Implementar cadastro e login em `apps/api/src/auth/` com DTOs RN-001, normalização de nome/email, senha preservada, Argon2id (64 MiB/3 iterações/paralelismo 1), conflito de email concorrente e erro genérico de credenciais; criar AuthSession com refresh opaco de 32 bytes/ SHA-256 e sete dias absolutos, JWT HS256 de 900s com sub/sid/iss/aud e segredo mínimo do plano. Cobrir sucesso, inválidos, espaços/senha longa e concorrência em `apps/api/test/integration/auth.spec.ts`; cadastro oferece login sem criar sessão. Referências: FR-001/002/005, RN-001.
- [ ] T011 [US1] Implementar guard global, refresh e logout em `apps/api/src/auth/guards/` e `apps/api/src/auth/auth.service.ts`, verificando sessão no banco, algoritmo/claims e expiração; cookie driverfin_refresh com atributos exatos do contrato, sem rotação/prorrogação, logout inclusive com access expirado e refresh válido. Aplicar locks concretos User→sessão e revalidação transacional, sem framework genérico; implementar GET `/users/me` mínimo em `apps/api/src/users/` para inicialização da sessão. Testar refresh inválido/revogado/expirado, logout idempotente, JWT ainda válido após revogação e isolamento de sessões em `apps/api/test/integration/auth.spec.ts`. Referências: FR-002/003/005/006/008.
- [ ] T012 [US1] Implementar cliente REST e sessão em memória em `apps/web/src/lib/api-client.ts` e `apps/web/src/features/auth/`: inicializar por refresh e perfil, uma renovação em andamento por aba, repetir uma vez somente após 401 com not_applied, tratar unknown sem reenvio, limpar dados ao logout e bloquear/revalidar no histórico/pageshow/foco. Tratar logout incerto sem afirmar revogação nem renovar automaticamente; não persistir credenciais no navegador. Referências: FR-002/003/006/021, RN-009.
- [ ] T013 [US1] Integrar telas cadastro/login em `apps/web/src/app/(public)/cadastro/page.tsx` e `apps/web/src/app/(public)/login/page.tsx`, raiz e shell privado em `apps/web/src/app/page.tsx`, `apps/web/src/app/(private)/layout.tsx` e `apps/web/src/components/layout/`; incluir navegação mobile/desktop, feedback e logout, encaminhando login ao destino `/dashboard` ainda sem métricas até US6. Validar labels, erros, credenciais inválidas e bloqueio visual durante inicialização; não exigir veículo/onboarding. Referências: FR-001–003/021/022.
- [ ] T014 [US1] Fechar jornada de acesso com Playwright em `apps/web/tests/e2e/auth.spec.ts`, `apps/web/playwright.config.ts` e harness de teste da API em `apps/api/test/`: cadastro→login→consulta própria→reload/refresh→logout→histórico, conta B e sessão inválida. Integrar E2E essencial à `.github/workflows/ci.yml` usando driverfin_test; validar manualmente telas nas quatro larguras e transporte de cookies/headers/no-store, registrando evidências em `specs/001-driverfin-v1/checklists/validation.md`. Referências: SC-001/005/006/007.

### US2 — Recuperar a senha

- [ ] T015 [US2] Implementar solicitação e envio Resend em `apps/api/src/auth/password-mailer.ts` e `apps/api/src/auth/auth.service.ts`: token de 32 bytes persistido só como hash, validade de 30 minutos, URL WEB_ORIGIN/redefinir-senha com fragmento, resposta 202 genérica inclusive conta ausente/falha de envio; revogar somente o token cujo envio falhou confirmadamente. Enviar após transação, nunca sob lock, sem segredos em logs; testar provider substituído e respostas em `apps/api/test/integration/password-recovery.spec.ts`. Referências: FR-004/005.
- [ ] T016 [US2] Implementar redefinição atômica em `apps/api/src/auth/`: validar senha antes de consumir, calcular hash fora do lock, reler token sob lock User, trocar senha, marcar uso e revogar links/sessões na mesma transação; expirar cookie local e rejeitar expiresAt igual a agora. Em `apps/api/test/integration/password-recovery.spec.ts`, testar link inválido/usado/revogado/expirado, senha inválida preservando token, leitura sem consumo e dois resets concorrentes com no máximo um sucesso. Referências: FR-004/005, RN-001.
- [ ] T017 [US2] Integrar recuperação/redefinição em `apps/web/src/app/(public)/recuperar-senha/page.tsx`, `apps/web/src/app/(public)/redefinir-senha/page.tsx` e `apps/web/src/features/auth/`; ler fragmento em memória e remover da URL, enviar somente ao salvar senha, apresentar confirmação genérica, validação e novo pedido para link inválido, limpar sessão e retornar ao login após sucesso. Validar estados e layout mobile/desktop. Referências: FR-004/005/021/022.
- [ ] T018 [US2] Fechar testes de concorrência entre login/reset e revogação em `apps/api/test/integration/auth-concurrency.spec.ts`, ajustando apenas mecanismos concretos de `apps/api/src/auth/`; provar que login com hash anterior não deixa sessão válida após reset concluído, que todos os links/sessões anteriores são invalidados e que requisições posteriores à revogação são negadas. Usar transações reais/barreiras controladas, sem hash caro ou Resend sob lock. Referências: FR-003–006, SC-005.
- [ ] T019 [US2] Fechar E2E de recuperação em `apps/web/tests/e2e/password-recovery.spec.ts` com link capturado exclusivamente pelo provider fake do harness em `apps/api/test/`, sem endpoint produtivo de inspeção: senha inválida, sucesso, senha antiga, uso repetido e sessões anteriores. Validar manualmente as quatro larguras e cenários US2, consolidando evidências em `specs/001-driverfin-v1/checklists/validation.md`; envio real e URL pública serão comprovados em T046/T047. Referências: SC-001/005/006/007/008.

**Checkpoint**: US1/US2 integradas; não avançar com falhas de sessão, recuperação, isolamento ou testes críticos. A tela de perfil e veículo continuam na fase 4.

## Fase 4 — Veículo e perfil (US3, P2)

**Objetivo**: consultar identificação própria e cadastrar/consultar um veículo.
**Aceite independente**: conta nova consulta perfil, cria veículo sem placa, reabre dados e rejeita segundo cadastro, inclusive concorrente.

- [ ] T020 [US3] Completar validação do GET `/users/me` já usado em T011 e implementar GET `/vehicles/me`, POST `/vehicles` e GET `/vehicles/fuels` em `apps/api/src/users/` e `apps/api/src/vehicles/`; validar RN-004, proprietário da sessão e criação serializada com logout/reset, mapear unique para 409. Em `apps/api/test/integration/vehicles-profile.spec.ts`, testar perfil sem dados sensíveis, veículo null, limites/combustíveis/placa opcional, concorrência de dois cadastros, sessão revogada e isolamento A/B. Referências: FR-006–008/015.
- [ ] T021 [US3] Implementar perfil somente leitura e veículo em `apps/web/src/app/(private)/perfil/page.tsx`, `apps/web/src/app/(private)/veiculo/page.tsx` e `apps/web/src/features/profile/`/`vehicle/`; formulário inicial ou consulta dos cinco campos, loading/vazio/erro/sucesso, validação e navegação responsiva. Não expor edição/exclusão, não criar bloqueio de acesso financeiro por ausência de veículo. Referências: FR-007/008/021/022, RN-004.
- [ ] T022 [US3] Fechar jornada em `apps/web/tests/e2e/vehicle-profile.spec.ts` e `specs/001-driverfin-v1/checklists/validation.md`: perfil próprio, cadastro sem placa, persistência, segundo cadastro recusado, erros e textos longos nas quatro larguras; conferir respostas diretas entre dois usuários. Manter regressão de ausência de veículo nas próximas tarefas de ganhos/despesas. Referências: SC-001/005/006/007.

**Checkpoint**: cadastro e consulta completos, testes aplicáveis aprovados; não adicionar manutenção de perfil/veículo.

## Fase 5 — Ganhos (US4, P2)

**Objetivo**: concluir CRUD vertical de ganhos antes de abrir despesas.
**Aceite independente**: criar, paginar, consultar seis campos, editar e excluir com persistência e isolamento, inclusive sem veículo. Reflexos no dashboard serão validados em T034/T038 quando US6 existir.

- [ ] T023 [US4] Implementar POST/GET lista/GET por id de ganhos e catálogo `/platforms` em `apps/api/src/earnings/`, com DTOs de seis campos, zeros explícitos, horas até 24, múltiplos registros legítimos iguais, autorização transacional e serialização exata. Paginar 20 itens, ordenar date/createdAt/id DESC e consultar items/total na mesma transação; testar limites, obrigatórios, plataforma, data/decimais inválidos, userId injetado, A/B e ausência de veículo em `apps/api/test/integration/earnings.spec.ts`. Referências: FR-006/009/010/015, RN-002/005/006.
- [ ] T024 [US4] Implementar PUT completo e DELETE físico em `apps/api/src/earnings/`, filtrados por id e userId, sessão revalidada sob lock User e 404 genérico sem upsert; preservar createdAt/dono e atomicidade. Ampliar `apps/api/test/integration/earnings.spec.ts` com alteração dos seis campos, rollback, registro removido/alheio e escritas concorrentes com logout/reset; provar substituição/exclusão integral sem deduplicação por conteúdo. Referências: FR-006/011/015/020, RN-009.
- [ ] T025 [US4] Implementar listagem paginada e cadastro em `apps/web/src/app/(private)/ganhos/page.tsx`, `apps/web/src/app/(private)/ganhos/novo/page.tsx` e `apps/web/src/features/earnings/`; EarningForm único com seis campos, data inicial do produto, vírgula decimal, orientação de horas/km como parcelas somadas, loading/erro/vazio/sucesso e bloqueio de duplo envio. Testar persistência após reload e acesso a registros antigos. Referências: FR-009/010/021–023, RN-002/005/006/009.
- [ ] T026 [US4] Integrar consulta/edição em `apps/web/src/app/(private)/ganhos/[id]/editar/page.tsx` reutilizando EarningForm e exclusão com AlertDialog identificando lançamento em `apps/web/src/features/earnings/`; atualizar lista após confirmação, recuperar paginação após exclusão, tratar removido, validação preservando campos e resultado incerto sem reenvio. Validar cancelar exclusão e manter acesso aos seis campos. Referências: FR-011/020/021, RN-009.
- [ ] T027 [US4] Fechar `apps/web/tests/e2e/earnings.spec.ts` com CRUD completo, cancelamento, zeros, registros iguais legítimos, sessão expirada, duplo toque, resposta perdida e registro removido; corrigir falhas e registrar validação manual das quatro larguras e cadastro em até 60s em `specs/001-driverfin-v1/checklists/validation.md`. Usar API/banco reais, interceptando rede só para falhas. Referências: SC-001/002/005/006/007.

**Checkpoint**: ganhos integrados e funcionando, automação crítica e manual aprovados antes de T028.

## Fase 6 — Despesas (US5, P2)

**Objetivo**: concluir CRUD vertical com cadastro rápido em formulário único.
**Aceite independente**: criar sem descrição, paginar, consultar, editar todos os campos e excluir; confirmação/cancelamento, persistência e isolamento corretos. Reflexos no dashboard serão validados em T034/T038.

- [ ] T028 [US5] Implementar POST/GET lista/GET por id e catálogo `/expense-categories` em `apps/api/src/expenses/`: data/categoria/valor obrigatórios, descrição opcional de até 500 caracteres e vazio→null, autorização transacional, paginação 20 com lista/total coerentes e ordem RN-006. Testar entradas/limites, categoria Outros sem descrição, userId injetado, isolamento A/B e operação sem veículo em `apps/api/test/integration/expenses.spec.ts`. Referências: FR-006/012/013/015, RN-003/005/006.
- [ ] T029 [US5] Implementar PUT completo e DELETE físico em `apps/api/src/expenses/` com id+userId, revalidação de sessão sob lock, atomicidade, 404 genérico e descrição omitida limpando para null. Ampliar `apps/api/test/integration/expenses.spec.ts` para edição/exclusão, inválidos sem alteração parcial, registro removido/alheio, concorrência com logout/reset e ausência de deduplicação automática. Referências: FR-006/014/015/020, RN-009.
- [ ] T030 [US5] Implementar listagem e cadastro em `apps/web/src/app/(private)/despesas/page.tsx`, `apps/web/src/app/(private)/despesas/nova/page.tsx` e `apps/web/src/features/expenses/`; ExpenseForm único priorizando valor→categoria→data→Salvar, descrição opcional, vírgula decimal, data inicial do produto e estados explícitos. Validar lista paginada, acesso a antigos e persistência. Referências: FR-012/013/021–023, RN-003/005.
- [ ] T031 [US5] Integrar consulta/edição em `apps/web/src/app/(private)/despesas/[id]/editar/page.tsx`, reutilizar ExpenseForm e implementar confirmação simples de exclusão em `apps/web/src/features/expenses/`; validar cancelamento, lista atualizada, página recuperável, removido, campos preservados em falha confirmada e unknown sem repetição. Referências: FR-014/020/021, RN-009.
- [ ] T032 [US5] Fechar `apps/web/tests/e2e/expenses.spec.ts` com CRUD sem descrição, edição/limpeza da descrição, cancelamento, falha/sessão/duplo envio e resposta incerta; corrigir falhas e registrar jornadas nas quatro larguras e cadastro em até 30s em `specs/001-driverfin-v1/checklists/validation.md`. Referências: SC-001/002/005/006/007.

**Checkpoint**: ganhos e despesas completos, sem abrir novas capacidades; dashboard passa a consumir dados reais dos dois domínios.

## Fase 7 — Dashboard (US6, P3)

**Objetivo**: entregar os 12 componentes e os três filtros com fonte financeira única.
**Aceite independente**: fixtures com dados conhecidos, fora do período e de B produzem exatamente totais, razões, distribuições, evolução e últimos cinco de A.

- [ ] T033 [US6] Implementar fonte única RN-007/008 em `apps/api/src/dashboard/domain/financial-summary.ts` e unitários próximos: somas exatas convertidas em BigInt, lucro, margem e razões por hora/km, arredondamento só final com empate afastando de zero, strings de duas casas e null/motivo para denominador zero. Provar 300−120=180, margem 60,00%, razões 50,00/30,00/3,00/1,80, 0,10+0,20=0,30, prejuízo, ±0,005→±0,01, somas grandes e razões de totais em vez de médias. Referências: FR-016, SC-003.
- [ ] T034 [US6] Implementar GET `/dashboard` em `apps/api/src/dashboard/` reutilizando calendário T008: period today/week/month com default month, limites inclusivos RN-006, snapshot read-only RepeatableRead, somas NUMERIC/groupBy por usuário/data e cinco candidatos de cada tipo mesclados por date/createdAt/id/type para últimos cinco; completar dias vazios até hoje, manter ordem dos catálogos e resposta única do contrato. Testar os 12 componentes, datas-limite, períodos vazios, registros de B, mudança de data/valor por edição e exclusão em `apps/api/test/integration/dashboard.spec.ts`, sem carregar histórico inteiro. Referências: FR-016–020, RN-006–008, SC-003/004/005.
- [ ] T035 [US6] Implementar página, filtro, cards e últimos lançamentos em `apps/web/src/app/(private)/dashboard/page.tsx` e `apps/web/src/features/dashboard/`: oito indicadores, datas-limite da API, cinco lançamentos com data/tipo/rótulo/valor, razões indisponíveis com explicação, estados vazio/loading/erro. Renderizar strings exatas sem recalcular fórmulas no frontend e iniciar em Mês. Referências: FR-016/018/019/021, RN-008.
- [ ] T036 [US6] Implementar PlatformRevenueChart, CategoryExpensesChart e FinancialEvolutionChart com Recharts 3 em `apps/web/src/features/dashboard/`: barras horizontais e evolução de receita/despesa/lucro, tamanhos fluidos, altura explícita, estados vazios, sinais negativos e consulta por toque/teclado com valores textuais acessíveis; usar number somente para coordenadas visuais e strings exatas em rótulos/tooltips. Referências: FR-017/022, RN-007/008.
- [ ] T037 [US6] Fechar atualização conjunta e prevenção de respostas antigas em `apps/web/src/features/dashboard/`: AbortController e identificador de consulta, substituir snapshot inteiro, buscar ao entrar/focar e após mutações confirmadas; não apresentar resultado anterior como filtro atual, sem polling/cache financeiro persistente. Em `apps/web/tests/e2e/dashboard.spec.ts`, testar filtros rápidos, loading, falha/retentativa e dados atuais ao retornar de ganhos/despesas. Referências: FR-019–021, SC-004/007.
- [ ] T038 [US6] Consolidar E2E com fixtures reais em `apps/web/tests/e2e/dashboard.spec.ts` e `apps/api/test/fixtures/`: exemplo completo US6, prejuízo/zero, distribuições somando totais, evolução sem dias futuros, últimos cinco e reflexos de edição/exclusão/data de ganhos e despesas. Validar todos os componentes nos três filtros, outro fuso no navegador, toque real e quatro larguras; registrar evidências em `specs/001-driverfin-v1/checklists/validation.md`. Referências: SC-001/003/004/005/006/007.

**Checkpoint**: todas as histórias e componentes integrados; falhas financeiras/isolamento bloqueiam avanço.

## Fase 8 — Revisão transversal

**Objetivo**: corrigir lacunas de experiência dos fluxos existentes.
**Aceite**: jornadas utilizáveis e estados coerentes em mobile/desktop, sem novas funcionalidades.

- [ ] T039 Revisar e corrigir navegação, responsividade e acessibilidade básica em `apps/web/src/app/`, `apps/web/src/components/` e `apps/web/src/features/`: 360/390/768/1366, foco/teclado/toque, labels, erros por campo, texto longo, campos/ações acessíveis e gráficos; eliminar rolagem horizontal sem ocultar defeitos com overflow. Registrar evidências em `specs/001-driverfin-v1/checklists/validation.md`. Referências: FR-022/023, SC-006.
- [ ] T040 Revisar a tabela inteira de estados do spec em `apps/web/tests/e2e/` e corrigir consumidores em `apps/web/src/lib/api-client.ts`, `apps/web/src/components/feedback/` e `apps/web/src/features/`: loading inicial/filtro, salvando, sucesso, validação, falha de consulta, falha confirmada, unknown, vazios, sessão e removido; verificar preservação de campos, ausência de reenvio indevido e feedback inequívoco. Referências: FR-020/021, RN-009, SC-007.

**Checkpoint**: defeitos obrigatórios corrigidos; melhorias visuais opcionais registradas no Backlog V2, sem implementação nesta fase.

## Fase 9 — Validação final

**Objetivo**: consolidar confiança no conjunto já testado incrementalmente.
**Aceite**: SC-001–007 comprovados e candidato pronto para publicação.

- [ ] T041 Executar lint, typecheck, unitários, integrações com PostgreSQL e builds/E2E essenciais definidos em `.github/workflows/ci.yml`, `apps/api/test/` e `apps/web/tests/e2e/`; verificar cálculos, autenticação, concorrência, isolamento HTTP direto, CRUD e dashboard em conjunto. Corrigir regressões obrigatórias na área responsável, reexecutar o afetado e registrar resultado da suíte final em `specs/001-driverfin-v1/checklists/validation.md`; não inventar percentual de cobertura.
- [ ] T042 Executar manualmente todos os cenários US1–US6 e casos de borda de `specs/001-driverfin-v1/spec.md`, seguindo `specs/001-driverfin-v1/quickstart.md`: quatro larguras, toque/teclado e tempos ≤30s despesa/≤60s ganho nas condições SC-002. Registrar cenário, resultado e evidência em `specs/001-driverfin-v1/checklists/validation.md`; corrigir bugs impeditivos e separar melhorias opcionais no Backlog V2 do README existente. Referências: SC-001–007.
- [ ] T043 Validar preparação de produção em `apps/api/Dockerfile`, `apps/api/prisma/migrations/`, exemplos de env e `specs/001-driverfin-v1/quickstart.md`: build sem DB, startup ESM, Argon2 no container, migrations reproduzíveis, falha de startup para env obrigatório ausente, logs sem segredos e TLS verificado. Registrar candidato validado e pendências operacionais em `specs/001-driverfin-v1/checklists/validation.md`, sem executar reset/seed fictício em produção.

**Checkpoint**: não adiar correções críticas para depois de publicar; não declarar sucesso produtivo com base apenas no ambiente local.

## Fase 10 — Deploy obrigatório

**Objetivo**: PostgreSQL/API na Railway, web na Vercel e recuperação real por Resend.
**Aceite**: URL pública HTTPS executa todas as jornadas, inclusive renovação/revogação e recuperação real.

- [ ] T044 Provisionar PostgreSQL 17 e API na Railway conforme `apps/api/Dockerfile` e `specs/001-driverfin-v1/plan.md`, confirmando capacidade/custos e backup/restauração; configurar Node/PORT/0.0.0.0 e todas as variáveis mínimas obrigatórias em secret store: DATABASE_URL privada/TLS, NODE_ENV, PORT, JWT_ACCESS_SECRET, JWT_ISSUER, JWT_AUDIENCE, WEB_ORIGIN, RESEND_API_KEY e RESEND_FROM. Definir WEB_ORIGIN com a URL canônica prevista para o frontend e garantir valores válidos para ela, RESEND_API_KEY e RESEND_FROM antes do startup final da API, nesta tarefa. Executar `db:deploy` no pre-deploy antes de `start:prod`, validar health e registrar IDs/URLs não secretos e procedimento de rollback da aplicação/correção forward de migration em `specs/001-driverfin-v1/checklists/validation.md`. Não migrar no build ou usar migrate dev em produção. Concluir startup/health sem depender da execução de tarefas posteriores: T045 publica/configura o frontend e valida rewrite/cookies/CORS, T046 valida domínio remetente/DNS e envio real Resend, e T047 executa o smoke integrado final; manter execução sequencial.
- [ ] T045 Publicar Next.js na Vercel usando `apps/web/next.config.ts` e `apps/web/package.json`, Root Directory apps/web e lockfile da raiz; configurar API_ORIGIN HTTPS somente no servidor, WEB_ORIGIN canônica na API, CORS sem wildcard, cookie host-only HttpOnly/Secure/SameSite=Lax/Path correto e private/no-store. Validar login/refresh/logout passando por rewrite, headers e ausência de cache privado; registrar evidências em `specs/001-driverfin-v1/checklists/validation.md`. Referências: FR-002/003/005/006, SC-008.
- [ ] T046 Validar domínio remetente/DNS verificado e a configuração RESEND_API_KEY/RESEND_FROM já definida em T044, validar URL WEB_ORIGIN do link e envio real de `apps/api/src/auth/password-mailer.ts` para destinatário de teste acessível; comprovar redefinição, uso único e revogação de sessões/links, sem guardar token na evidência. Registrar entrega e resultado em `specs/001-driverfin-v1/checklists/validation.md`. Referências: FR-004/005, SC-008.
- [ ] T047 Executar smoke da URL pública conforme `specs/001-driverfin-v1/quickstart.md`, com conta de teste própria: cadastro/login, reload/refresh, recuperação, perfil/veículo, CRUD de ganhos/despesas, dashboard/filtros/gráficos, logout/histórico em mobile e desktop; conferir persistência, HTTPS, migrations, cookies/CORS/Resend e saúde do banco/API. Corrigir falhas, republicar o necessário e registrar evidências finais em `specs/001-driverfin-v1/checklists/validation.md`. Referências: SC-008.

**Checkpoint**: três componentes publicados e recuperação real comprovada; deploy não é opcional nem substituível por screenshots locais.

## Fase 11 — README e Portfólio

**Objetivo**: documentar o produto publicado e verificar a DoD inteira antes de anunciar conclusão.
**Aceite**: instruções reproduzíveis, screenshots reais, GitHub/URL públicos e apresentação fiel ao produto.

- [ ] T048 Renomear `readme.md` para `README.md` preservando conteúdo/links e finalizar problema, solução, screenshots reais do produto publicado em `docs/screenshots/`, funcionalidades, stack, arquitetura, execução local, decisões técnicas, URL pública e melhorias futuras; incluir literalmente “Projeto desenvolvido para portfólio a partir de um cenário inspirado em uma demanda real de mercado. Não possui vínculo com o solicitante original.” Não anunciar funcionalidades não implementadas. Referência: constituição XIV, SC-009.
- [ ] T049 Executar instruções de `README.md` e `specs/001-driverfin-v1/quickstart.md` em checkout limpo com ambiente local isolado, verificando instalação, env, migrations/catálogos, startup, testes e links; corrigir somente documentação/comandos inconsistentes com o produto e confirmar repositório disponível no GitHub. Registrar evidências reproduzíveis e ausência de segredos versionados em `specs/001-driverfin-v1/checklists/validation.md`. Referência: SC-009.
- [ ] T050 Verificar integralmente a Definition of Done dos princípios VII/XI–XVI da constituição e do spec em `specs/001-driverfin-v1/checklists/validation.md`: GitHub; cadastro/login/logout/recuperação; perfil/veículo; CRUDs; oito indicadores, três gráficos e últimos lançamentos; três filtros; isolamento/precisão/estados; testes e quatro larguras; frontend/API/banco publicados; README/screenshots e URL funcional; confirmar SC-001–009. Somente com todos os itens obrigatórios satisfeitos, adicionar a apresentação ao portfólio com URL/screenshot reais de `README.md`, registrar o link da apresentação e declarar **DriverFin V1 CONCLUÍDA**. Qualquer pendência obrigatória mantém esta tarefa aberta e exige correção, nunca dispensa silenciosa.

## Dependências e estratégia incremental

```text
Fundação T001–T005
  → Banco/base T006–T009
  → US1 T010–T014 → US2 T015–T019 (autenticação inteira)
  → US3 T020–T022
  → US4 T023–T027
  → US5 T028–T032
  → US6 T033–T038
  → Revisão T039–T040 → Validação T041–T043
  → Deploy T044–T047 → README/Portfólio/DoD T048–T050
```

A ordem é de execução, não apenas de dependência técnica: US4/US5 não dependem de existir veículo, e US6 pode ser testada com fixtures sem operar formulários, mas suas implementações aguardam os checkpoints anteriores. T011 antecipa somente GET `/users/me`, necessário à sessão aprovada; T020 reaproveita esse endpoint e T021 entrega a tela US3. T034/T038 fecham reflexos financeiros de US4/US5, sem exigir dashboard prematuro.

Primeiro incremento verificável: fundação/base + US1; primeiro bloco funcional completo: fase 3 com US1/US2. **O MVP publicável continua sendo a V1 inteira**, incluindo as seis histórias, deploy e documentação; nenhuma prioridade permite cortar US3–US6.

### Paralelismo por história

| História | Execução escolhida e oportunidade segura após integração |
|----------|---------------------------------------------------------|
| US1 | T010→T014; cenários HTTP e inspeção manual podem ser executados separadamente após integração, sem editar cliente/guard simultaneamente. |
| US2 | T015→T019; cenários de token isolados podem ser executados junto da inspeção das telas após T018, com dados separados. |
| US3 | T020→T022; revisar layout de perfil e veículo após T021 é independente, mas o fechamento de testes é único. |
| US4 | T023→T027; executar cenários com fixtures isoladas após o CRUD estar integrado, sem dividir alterações no EarningForm. |
| US5 | T028→T032; validar cenários isolados após integração, sem abrir outra história ou dividir ExpenseForm. |
| US6 | T033→T038; unitários puros podem rodar junto da inspeção visual após integração; cards/gráficos/filtro não são tarefas paralelas porque compartilham snapshot e componentes. |

Essas oportunidades são verificações dentro das tarefas, não autorização para abrir várias áreas ou compartilhar/resetar o mesmo banco de teste em execuções simultâneas. Nenhuma justifica marcação `[P]` neste roteiro.

## Cobertura e contagem

| Área | Tarefas | Referências principais |
|------|---------|------------------------|
| Fundação/base | 9 | Constituição IV/V/IX/XI; RN-001–006; fronteiras REST |
| US1 — acesso | 5 | FR-001–003/005/006; RN-001; SC-001/005–007 |
| US2 — recuperação | 5 | FR-004/005/006; SC-001/005–008 |
| US3 — veículo/perfil | 3 | FR-007/008/015; RN-004; SC-001/005–007 |
| US4 — ganhos | 5 | FR-009–011/015/020–023; RN-002/005/006/009; SC-001/002/005–007 |
| US5 — despesas | 5 | FR-012–015/020–023; RN-003/005/006/009; SC-001/002/005–007 |
| US6 — dashboard | 6 | FR-016–022; RN-006–008; SC-001/003–007 |
| Revisão/validação/deploy/documentação | 12 | FR/SC transversais; SC-008/009; DoD constitucional |
| **Total** | **50** | **23 FRs, 9 RNs, 9 SCs e seis histórias obrigatórias** |

## Pontos de decisão e limites de escopo

- **ESM aprovado**: `research.md` §2 e `plan.md` definem backend ESM e orientam T003/T005/T043. CommonJS não integra a configuração aprovada da V1; a sincronização documental não reabre a decisão de stack.
- **Validação publicada na fase 10**: Fundação e Autenticação validam localmente `/api`, rewrite, headers, cookies, no-store, build, startup e E2E em T003–T005/T014. Essa evidência não substitui produção; validar Vercel/Railway em T045/T047 e corrigir falhas de cookies, rewrite, CORS ou sessão antes do smoke final e da conclusão da V1. Não há deploy intermediário nem gate de publicação antes de US4.
- **Dependências operacionais**: credenciais/URLs efetivas, disponibilidade/custo Railway/Vercel, domínio/DNS Resend e destino de portfólio serão resolvidos nas tarefas correspondentes; ausência de acesso mantém a tarefa pendente. Mudança de provedor/arquitetura ou capacidade não prevista exige decisão registrada antes de virar trabalho.
- **Escopo fechado**: nenhuma tarefa de múltiplos veículos, edição/exclusão de veículo, edição de perfil, período personalizado, notificações, importação/OCR, PWA, dark mode, login social, PDF/Excel, IA, planos pagos ou qualquer capacidade do Backlog V2. Sem frameworks de sessão/locks/idempotência, filas, packages ou abstrações preventivas.
- **Evidências e documentação auxiliar**: `checklists/validation.md` e `docs/screenshots/` apenas armazenam provas dos gates já exigidos; não introduzem requisitos de produto. Necessidades novas não previstas devem ser registradas como ponto de decisão, sem tarefa de implementação automática.
