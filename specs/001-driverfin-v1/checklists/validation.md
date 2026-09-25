# Evidências de validação — DriverFin V1

## Fundação — T001–T005

Base: constituição 1.0.0, spec, plan, tasks, research, data-model, contrato REST e
quickstart de `001-driverfin-v1`. Revisão base: `23a6fda3324e4b1ee02c3b03d9ae4a101ccf7da4`;
validações de 2026-09-09 sobre o working tree, sem commit automático.

Pré-execução: `check-prerequisites.sh --json --require-tasks --include-tasks` aprovado;
`requirements.md` com 16/16 itens concluídos. Sem hooks before/after_implement.
Node 24.16.0, npm 11.16.0, Docker 29.5.2 e Compose 5.1.4 disponíveis.

### T001 — Monorepo (PASS)

- Raiz e dois workspaces privados; Node/npm fixados em engines e `.nvmrc`/packageManager.
- `npm install` e `npm ci`: exit 0; `npm ls --workspaces --depth=0` confirmou somente
  `@driverfin/web` e `@driverfin/api`, ambos com TypeScript 5.9.3.
- SHA-256 do lockfile antes/depois de `npm ci`:
  `c8984a6c05cb87cdaaecd9bd4faa0f0742f18204462ea835e0ab3b3a808b3179`.
- Scripts dos aplicativos serão exercitados quando seus executores/configurações
  forem adicionados em T003–T005; não foram considerados builds aprovados em T001.
- Acesso npm no sandbox retornou EAI_AGAIN; consulta/instalação autorizadas fora do
  sandbox resolveram a restrição, sem alteração de stack.

### T002 — PostgreSQL local (PASS)

- `docker compose config --quiet` e `docker compose up -d --wait db`: exit 0.
- PostgreSQL 17.11 em `driverfin-db-1`, bind `127.0.0.1:5433`, volume próprio
  `driverfin_postgres_data`; estado healthy antes e depois de `docker compose restart db`.
- `SELECT system_identifier FROM pg_control_system()` retornou
  `7683512665063538726` antes/depois: mesmo cluster persistido. Schema public sem tabelas.
- `docker ps` confirmou que `postgres-postgres-local-1` permaneceu healthy na porta
  55432; nenhum comando de mudança foi dirigido a esse container.
- `git check-ignore .env apps/api/.env apps/web/.env.local` confirmou os três arquivos
  protegidos. Exemplos usam placeholders; arquivos locais usam senha aleatória não registrada.
- Portas 3000/3001/5433 estavam livres. Acesso ao socket Docker e inspeção de portas
  exigiram execução autorizada fora do sandbox; validações então aprovadas.

### T003 — API ESM (PASS)

- NestJS 11.2.3/Express, Prisma/client/adapter-pg 7.10.0, pg 8.23.0 e CLI Nest 11.0.24.
- `npm run db:generate --workspace apps/api`: exit 0; client 7.10.0 gerado sem modelos,
  sem flags removidas e sem criar migrations. Saída ignorada em src/generated/prisma.
- `npm run build --workspace apps/api`: exit 0; generate precedeu nest build e produziu
  dist/main.js e client compilado, mantendo NodeNext, decorators e imports .js.
- `npm run start:prod --workspace apps/api`: processo iniciou em 0.0.0.0:3001;
  requisição HTTP respondeu 404 esperado (o health só entra em T004).
- Startup no sandbox falhou com listen EPERM; execução autorizada fora dele iniciou
  normalmente. Não foi necessário modificar ESM nem a arquitetura.
- Scripts db:dev/db:deploy/db:seed e harness de domínio não são anunciados como
  funcionais aqui: migrations/modelos/seed serão adicionados em T006/T007.

### T004 — Web e transporte (PASS)

- Next.js 16.3.4/React 19/Tailwind 4; apenas página inicial informativa, sem jornadas
  de negócio. `npm run build --workspace apps/web` e `npm run start --workspace apps/web`
  aprovados; API recompilada e iniciada com o client Prisma real.
- `curl -sS -i http://127.0.0.1:3001/api/health` e a mesma rota na porta 3000:
  200, corpo `{status:"ok"}`, Cache-Control private, no-store.
- `docker compose stop db`: ambas as origens retornaram 503 com code SERVICE_UNAVAILABLE,
  mensagem genérica e requestId; sem conexão, SQL, stack ou writeOutcome no JSON.
- `docker compose up -d --wait db`: voltou a 200 pela web, sem reiniciar a API.
- Com web compilada ativa e API parada, `npm run test:transport --workspace apps/web`:
  exit 0. Fixture apenas de teste confirmou método, caminho/query, corpo POST,
  Authorization, Cookie, dois Set-Cookie e três chamadas efetivas à origem (sem cache).
- Fixture não adiciona endpoints ao Nest/Next e não implementa autenticação.

### T005 — Ferramentas, CI e imagem da API (PASS)

- Ambiente confirmado em Node 24.16.0 e npm 11.16.0, alinhado a `.nvmrc`, engines,
  lockfile e workflow. `npm run lint` e `npm run typecheck`: exit 0 nos dois workspaces.
- Builds independentes de API e web e build sequencial da raiz: exit 0. A API executou
  `prisma generate` antes de `nest build`; o build da imagem usou URL sintática sem banco.
- `test:unit`: 1 suíte, 11 testes aprovados. `test:foundation`: 1 suíte, 2 testes
  aprovados contra PostgreSQL real. Jest executou ESM compilado com NodeNext/decorators.
- Imagem `driverfin-api:t005` construída a partir de Node 24.16.0 bookworm-slim. O
  container iniciou como usuário `node` (UID 1000), conectado ao PostgreSQL 17 local.
- Dentro da imagem, Prisma CLI 7.10.0 carregou `prisma.config.ts` e
  `prisma/schema.prisma`; runtime ESM iniciou `apps/api/dist/main.js`.
- `GET /api/health` da imagem respondeu 200, `{status:"ok"}` e
  `Cache-Control: private, no-store`.
- Web compilada iniciou na porta 3000. `test:transport` aprovado confirmou método,
  caminho/query, corpo, Authorization, Cookie, dois Set-Cookie e no-store pelo rewrite.
- A primeira execução do smoke de transporte no sandbox recebeu `listen EPERM`; a
  repetição autorizada fora do sandbox passou sem alteração de código.

### Limite desta execução

T001–T005 concluídas. T006 e seguintes dependem das evidências registradas abaixo antes
de serem marcadas como concluídas.

## Banco e domínio base — T006–T009

### T006 — Modelo de dados e migration inicial (PASS)

- `prisma validate` e `prisma format`: exit 0. O schema contém somente User, Vehicle,
  Earning, Expense, Platform, ExpenseCategory, AuthSession e PasswordResetToken, mais
  o enum Fuel aprovado; não foram criadas entidades de dashboard ou V2.
- Migration `20260924172836_initial_domain` gerada, SQL revisado e aplicado em PostgreSQL
  17 real. Inspeção do catálogo confirmou as oito tabelas previstas.
- Datas financeiras são `date`; dinheiro/km são `numeric(65,2)`; horas são
  `numeric(4,2)`; metadados e expirações usam `timestamptz(3)`.
- SQL versiona e-mail canônico, textos obrigatórios, ano mínimo, valores positivos,
  corridas/horas/km, exclusão de NaN e expirações posteriores à criação. Unique de e-mail
  e veículo, FKs e índices aprovados constam na mesma migration.
- O primeiro `migrate dev --create-only` dentro do sandbox não alcançou localhost:5433;
  a repetição autorizada contra o banco local criou e aplicou a migration corretamente.

### T007 — Migrations, catálogos, Prisma e harness (PASS)

- A migration inicial insere cinco plataformas e nove categorias com IDs e ordens
  estáveis. O banco local foi recriado após consentimento explícito e a migration foi
  aplicada do zero com sucesso.
- `db:seed` usa upsert Prisma e foi executado duas vezes: ambas exit 0, mantendo os
  mesmos cinco e nove registros. O primeiro executor tentado com TypeScript nativo não
  resolveu imports ESM `.js`; foi substituído por `tsx`, preservando o client ESM.
- `PrismaModule` global e `PrismaService` centralizam adapter-pg e encerramento do client;
  o health passou a reutilizar esse ciclo de vida.
- Harness exige `TEST_DATABASE_URL` cujo banco é exatamente `driverfin_test`, propaga-a
  apenas ao processo Prisma e executa `migrate deploy`, a mesma migration de produção.
- Banco `driverfin_test` vazio recebeu a migration: exit 0. Suíte integration: 1 suíte,
  4 testes aprovados, cobrindo catálogos, e-mail canônico/unique, veículo unique, FKs,
  valores/horas e expiração. A CI básica agora executa essa suíte.

### T008 — Calendário e decimais (PASS)

- Relógio injetável e calendário puro usam `America/Sao_Paulo`; nenhuma asserção depende
  da data real do CI. Today/week/month, segunda/domingo, limites inclusivos, série até
  hoje, meia-noite de São Paulo, viradas de mês/ano e fevereiro bissexto foram cobertos.
- Validação de data recusa calendário inválido e futuro; teto do veículo deriva do ano
  local injetado + 1.
- Validação decimal opera sobre strings/BigInt escalado: recusa vazio, expoente, sinais,
  NaN/Infinity, excesso de casas/dígitos, zero quando positivo e horas acima de 24,
  sem `Number`, arredondamento ou truncamento. Vírgula é apenas normalizada para ponto.
- `test:unit`: 3 suítes, 37 testes aprovados. Lint e typecheck da API: exit 0.

### T009 — Fronteiras REST comuns (PASS)

- `ValidationPipe` global usa whitelist, `forbidNonWhitelisted`, transformação sem
  coerção implícita e erros por campo; payload com `userId` extra e número em campo texto
  foram recusados antes do controller.
- Middleware exige JSON, Origin igual a WEB_ORIGIN e `X-DriverFin-Client: web` em métodos
  mutáveis. CORS permite credenciais somente para origem configurada.
- Filtro produz code/message/fields/requestId, omite `writeOutcome` em GET e distingue
  `not_applied` de rollback confirmado e `unknown`; respostas recebem private/no-store.
  Logs registram somente método, caminho, status e requestId, sem corpo ou credenciais.
- Interceptor serializa Prisma Decimal para duas casas, datas financeiras para YYYY-MM-DD
  e timestamps para ISO. A web normaliza vírgula e formata strings sem `parseFloat`.
- Validação de ambiente cobre PostgreSQL, porta, NODE_ENV, origem exata, segredo JWT de
  32 bytes, issuer/audience e configuração Resend obrigatória em produção.
- Suíte integration após T009: 2 suítes, 8 testes aprovados. A primeira tentativa expôs
  bootstrap executado durante import e ConfigService fora do escopo do PrismaModule;
  ambos foram corrigidos sem alterar arquitetura.

## US1 — Acesso (recorte desta execução)

### T010 — Cadastro e login backend (PASS)

- POST `/api/auth/register` normaliza trim de nome e trim/lowercase de e-mail, preserva
  integralmente a senha, aplica RN-001 e retorna somente id/nome/e-mail, sem criar sessão.
- Senhas usam Argon2id com 64 MiB, três iterações, paralelismo 1 e salt aleatório. Testes
  confirmaram senha com espaços e senha de 128 caracteres sem trim silencioso.
- Duplicidade normalizada retorna 409; duas requisições concorrentes deixaram exatamente
  um usuário e produziram um 201 e um 409.
- Login inválido usa sempre `INVALID_CREDENTIALS` sem fields. Login válido cria sessão
  com refresh opaco de 32 bytes, persiste apenas SHA-256 hexadecimal e expira em sete dias.
- Access JWT usa HS256, 900 segundos, sub/sid/iss/aud. Cookie refresh foi verificado com
  HttpOnly, SameSite=Lax, Path=/api/auth e validade correspondente; nenhum token foi
  registrado nesta evidência.
- Suíte integration final: 3 suítes, 18 testes aprovados contra `driverfin_test`. O
  harness também foi executado apontando propositalmente para `driverfin` e recusou antes
  de acessar o banco, comprovando a proteção.
- A primeira execução de auth revelou normalização posterior à validação e carregamento
  precoce do ambiente de teste. DTOs passaram a transformar somente nome/e-mail e a
  configuração da aplicação foi separada do bootstrap. Senha permaneceu inalterada.
- Cinco contas fixture criadas por aquela execução no banco local foram removidas por
  e-mail conhecido; inspeção final confirmou zero usuários e catálogos 5/9 preservados.

## Validação consolidada — T005–T010

- `npm run lint`: PASS nos dois workspaces.
- `npm run typecheck`: PASS nos dois workspaces.
- `npm run test:unit --workspace apps/api`: 3 suítes, 38 testes, PASS.
- `npm run test:foundation --workspace apps/api`: 1 suíte, 2 testes, PASS.
- `npm run test:integration --workspace apps/api`: 3 suítes, 18 testes, PASS.
- `npm run build`: API e web em sequência, PASS; Prisma generate precedeu Nest build.
- Imagem `driverfin-api:t010`: build sem banco, PASS; startup real contra PostgreSQL,
  módulos Prisma/JWT/Auth carregados, UID 1000 e `/api/health` 200 private/no-store.
- Workflow `.github/workflows/ci.yml`: actionlint sem erros.
- T011 não foi iniciada: não há guard global, refresh, logout ou `/users/me`.
Nenhuma conclusão da V1, deploy ou funcionalidade de negócio é declarada aqui.

## US1 — T011 (PASS)

- Guard global valida algoritmo, claims, expiração e sessão ativa no banco; somente rotas
  explicitamente públicas escapam da autenticação.
- Refresh relê User→AuthSession sob locks PostgreSQL, sem rotação ou prorrogação. Logout
  aceita refresh ou JWT verificável mesmo expirado, revoga sob os mesmos locks e expira cookie.
- `GET /api/users/me` retorna somente id, nome e e-mail do proprietário da sessão.
- `npm run test:integration --workspace apps/api`: 3 suítes, 22 testes, PASS, cobrindo refresh
  inválido/expirado/revogado, logout idempotente, JWT revogado e sessões independentes.
- Lint e typecheck da API: PASS. T012 e seguintes permaneciam abertas neste checkpoint.

## US1 — T012–T014 (PASS)

- Cliente REST mantém access token somente em memória, compartilha uma renovação em andamento,
  repete uma vez apenas 401 `not_applied` e bloqueia renovação após logout incerto.
- Cadastro/login, shell privado, feedback, logout e placeholder honesto do dashboard foram
  integrados. Lint, typecheck e build de produção Next.js: PASS.
- Playwright cobriu cadastro→login→reload/refresh→logout→histórico, credencial inválida e
  contas independentes. Resultado: 6/6 testes PASS em Chromium oficial via container.
- Login e cadastro foram verificados sem rolagem horizontal e com labels visíveis em
  360, 390, 768 e 1366 px. CI instala Chromium e executa o E2E contra `driverfin_test`.

### Correção de revisão P2 — revalidação obsoleta (PASS)

- Revisão identificou que um refresh inicial/lento podia terminar depois de um login válido,
  limpar o novo access token e devolver o provider ao estado anônimo.
- `AuthProvider` passou a versionar operações: apenas a revalidação/autenticação mais recente
  pode alterar usuário/status ou limpar sessão. Login/logout invalidam operações anteriores.
- `api-client` também versiona credenciais, impedindo que a resolução tardia de refresh
  substitua o access token emitido por login mais recente.
- Regressão Playwright segura o refresh inicial, conclui login e depois libera o 401 antigo.
  `auth.spec.ts`: 7/7 PASS; lint, typecheck e build de produção web: PASS.

## US2 — T015–T019 (PASS)

- Recuperação usa token aleatório de 32 bytes, persiste apenas SHA-256, expira em 30 minutos
  e responde 202 genericamente. O provider Resend é substituível e roda fora de locks.
- Reset valida antes de consumir, calcula Argon2 fora do lock, relê User→token sob lock e
  troca senha/revoga links e sessões atomicamente. Expiração na igualdade é inválida.
- Barreira controlada provou que login com hash antigo não cria sessão após reset concluído.
- Telas leem o fragmento somente em memória, removem-no da URL e oferecem novo pedido em
  link inválido. Lint, typecheck e build Next.js: PASS.
- E2E com provider fake exclusivo do harness, sem endpoint produtivo: senha inválida, sucesso,
  senha antiga, link repetido e sessão anterior. Jornada principal PASS; responsividade 5/5
  em 360/390/768/1366 após corrigir a distinção entre token carregando e token ausente.

## US3 — T020 backend (PASS)

- `GET /users/me`, `GET /vehicles/me`, `GET /vehicles/fuels` e `POST /vehicles` autorizam
  pelo usuário da sessão; criação relê a sessão sob lock User e serializa com logout/reset.
- RN-004, catálogo ordenado, placa opcional, veículo nulo, isolamento A/B, sessão revogada,
  dados sensíveis ausentes e dois cadastros concorrentes foram cobertos.
- Suíte consolidada da API: 6 suítes, 39 testes de integração, PASS. Lint e typecheck dos
  dois workspaces: PASS. T021 e seguintes não fazem parte deste checkpoint.

## US3/US4 e início da US5 — T021–T030 (PASS)

- Perfil somente leitura e veículo inicial/consulta foram integrados sem edição/exclusão;
  cadastro sem placa persistiu após reload e ausência de veículo não bloqueou lançamentos.
- Ganhos possuem catálogo, CRUD integral, paginação de 20, ordem estável, valores exatos,
  zeros explícitos, isolamento A/B e revalidação de sessão sob lock antes das escritas.
- O E2E de ganhos cobriu cadastro/consulta/edição/exclusão, cancelamento, reload, sessão
  expirada, bloqueio de repetição, resposta perdida e registro removido. A jornada principal
  executou em 3,0s no ambiente local, abaixo do limite manual de 60s.
- Despesas possuem catálogo e API CRUD integral; descrição vazia/omitida vira null, e o
  formulário valor→categoria→data→Salvar persistiu sem veículo e sem descrição após reload.
- Integração: 8 suítes e 59 testes PASS. Playwright: perfil/veículo e ganhos aprovados nas
  larguras 360/390/768/1366; cenário adicional de despesas PASS. Rede foi interceptada
  somente nos casos explícitos de falha, mantendo API e PostgreSQL reais no fluxo normal.
- Lint dos dois workspaces, typecheck e builds de produção da API/web: PASS.

### Correções de revisão — smoke de produção e sessão transitória (PASS)

- Problema P1: o smoke criava a imagem corretamente, mas iniciava o container em produção
  somente com DATABASE_URL/PORT. A validação encerrava o processo antes do health porque
  WEB_ORIGIN, JWT_ACCESS_SECRET/ISSUER/AUDIENCE e RESEND_API_KEY/FROM eram obrigatórias.
- Correção P1: o `docker run` do CI agora fornece explicitamente todas as variáveis mínimas,
  com valores exclusivos e não secretos de smoke; a prontidão continua usando PostgreSQL real.
- Validação P1: imagem reconstruída sem banco durante o build; container iniciado com
  `NODE_ENV=production` e conjunto completo de env; `GET /api/health` respondeu `{"status":"ok"}`.
- Problema P2: qualquer erro em refresh ou `/users/me`, inclusive rede/5xx, limpava o access
  token e convertia indisponibilidade da API em logout definitivo.
- Correção P2: apenas 401 definitivo limpa credenciais e produz estado anônimo. Falhas de
  transporte/serviço entram em `unavailable`, preservam a sessão, ocultam o conteúdo privado
  e oferecem nova tentativa sem redirecionar. O versionamento impede respostas antigas.
- Regressão Playwright: após login, refresh abortado mantém `/dashboard`, exibe mensagem de
  indisponibilidade e, ao restaurar a rede, “Tentar novamente” recupera o dashboard sem login.
- Validação consolidada: actionlint, lint, typecheck, build API/web e `auth.spec.ts` 8/8 PASS.

### Correção transversal — formatação e legibilidade (PASS)

- Problema: não havia formatter, scripts nem gate de CI; lint/typecheck aceitavam arquivos
  com múltiplas declarações e grandes árvores JSX concentradas em uma única linha.
- Correção: Prettier 3.8.3 foi fixado na raiz, com configuração de 100 colunas,
  `.prettierignore`, scripts `format`/`format:check` e verificação anterior ao lint no CI.
- Escopo: código e configurações mantidos em `apps/api`, `apps/web`, raiz e workflow foram
  formatados; artefatos Spec Kit, documentação, lockfile, builds e Prisma gerado são ignorados.
- Prevenção: todo novo trabalho deve executar `npm run format`; o CI rejeita divergências por
  `npm run format:check`, independentemente de lint, typecheck ou build aprovarem.
- Validação: format:check, lint, typecheck, 38 unitários, 59 integrações, build API/web e
  Playwright completo com 27/27 cenários aprovados; nenhuma regra funcional foi alterada.

## US5 — T031–T032 (PASS em 2026-09-25)

- O `ExpenseForm` único atende criação e edição; a rota de consulta/edição carrega os
  quatro campos, preserva valores após falha, confirma/cancela exclusão e retorna à lista.
- `expenses.spec.ts`: 7/7 PASS em Chromium 1.55 com API e PostgreSQL reais. Cobertos CRUD,
  descrição opcional/limpeza, persistência, falha de consulta, sessão inválida, duplo
  acionamento, `unknown` com uma tentativa e registro removido.
- Responsividade: PASS em 360, 390, 768 e 1366 px, sem overflow. O cadastro automatizado
  em cada largura ficou abaixo de 30s.
- `npm run format`, lint e typecheck web: PASS. Playwright executado no container oficial
  1.55, rede host, UID 1000 e `HOME=/tmp` após iniciar o PostgreSQL local saudável.

## US6 — T033 (PASS em 2026-09-25)

- `financial-summary.ts` é a fonte única para lucro, margem e razões. Entradas e somas
  usam `BigInt`; a serialização ocorre em strings de duas casas e divisão por zero retorna
  `null` com motivo, nunca zero artificial.
- Unitários provaram o exemplo 300/120/180, margem 60%, razões 50/30/3/1,80, soma
  0,10+0,20, prejuízo, empates positivo/negativo, soma grande e razão dos totais.
- `npm run test:unit --workspace apps/api`: 4 suítes, 43 testes, PASS. Lint e typecheck
  da API: PASS.

### T034 — Endpoint e snapshot (PASS)

- `GET /api/dashboard` entrega a resposta única contratada para today/week/month (default
  month) em transação PostgreSQL `RepeatableRead` marcada read-only. Somas e grupos são
  executados pelo banco; somente dias vazios e dez candidatos recentes são compostos em memória.
- Integração com PostgreSQL real: 1 suíte, 2 cenários, PASS. Comprovados totais, razões,
  ordem dos catálogos, evolução, cinco recentes, isolamento A/B, default/filtro inválido,
  edição e exclusão refletidas e ausência de dias futuros.
- Lint e typecheck da API: PASS. O primeiro acesso ao banco dentro do sandbox recebeu P1001;
  a repetição autorizada contra o mesmo `driverfin_test` saudável passou sem mudança de código.

### T035 — Dashboard principal (PASS)

- A página inicia em Mês, oferece Hoje/Semana/Mês, renderiza os oito indicadores e os
  cinco lançamentos diretamente das strings da API. Razões indisponíveis exibem travessão
  e motivo; loading, erro com retentativa, vazio e sucesso são distintos.
- `npm run lint --workspace apps/web`, typecheck e build Next.js de produção: PASS.

### T036 — Gráficos (PASS)

- Recharts 3.3.0 implementa barras horizontais por plataforma/categoria e linhas de
  receita/despesa/lucro. Containers têm altura explícita e grade responsiva; valores
  negativos não são limitados. Estados vazios são textuais.
- Conversão para `number` existe somente nas coordenadas. Tooltip, listas acessíveis e
  tabela navegável usam as strings exatas da API. A camada de acessibilidade do Recharts 3
  permanece habilitada.
- Lint/typecheck: PASS. O build passou após remover apenas o cache `.next` que reteve a
  falha conhecida de porta interna do Turbopack; nenhuma fonte foi removida.

### T037–T038 — Consistência e consolidação do Dashboard (PASS)

- Cada consulta usa `AbortController` e identificador monotônico; troca de filtro remove o
  snapshot anterior e só a resposta atual pode substituir o conjunto completo. Há busca na
  entrada e no foco, sem polling ou cache financeiro persistente.
- Playwright `dashboard.spec.ts`: 7/7 PASS. Cobertos 12 componentes, três filtros, loading,
  falha/retentativa, troca rápida, retorno após editar ganho/despesa, toque, outro fuso e
  360/390/768/1366 px sem overflow.
- Integração `dashboard.spec.ts`: 3/3 PASS no PostgreSQL real. Além do exemplo completo,
  cobre isolamento, fora do período, prejuízo, denominadores zero, dias vazios/futuros,
  cinco recentes e reflexos de edição/exclusão. Fixture determinística registrada em
  `apps/api/test/fixtures/dashboard.ts`.
- `initialDimension` eliminou o aviso de dimensão inicial negativa do Recharts; reexecução
  E2E final não apresentou o aviso.

## Revisão transversal — T039–T040 (PASS em 2026-09-25)

- Revisados shell, páginas, formulários, listas, dialogs e dashboard. Foco visível foi
  uniformizado; erros financeiros por campo agora usam `aria-invalid`, `aria-describedby`
  e mensagem associada. Gráficos mantêm texto/tabela acessível e toque/teclado.
- 360, 390, 768 e 1366 px passaram sem overflow de página nas jornadas automatizadas;
  grids usam `minmax(0, ...)`, cards quebram texto e dialogs empilham ações no mobile.
- Estados verificados: loading inicial/filtro, salvando, sucesso, validação, falha de
  consulta e retentativa, falha confirmada, `unknown`, vazio, sessão inválida e removido.
  Formulários preservam campos; busy bloqueia repetição e `unknown` não é reenviado.
- Playwright completo: 40/40 PASS em Chromium 1.55, com API e PostgreSQL reais. Inclui
  auth, recuperação, veículo/perfil, ganhos, despesas e dashboard nas quatro larguras.
- `npm run format:check`, lint e typecheck dos dois workspaces: PASS. Builds finais API
  (Prisma generate + Nest) e web (Next produção, 14 rotas) passaram.
- T041 e tarefas posteriores não foram iniciadas.

### Correções do review de T031–T040 (PASS)

- O intervalo visível do dashboard usa `period.endDate`, que representa o limite inclusivo
  do filtro; `seriesEndDate` permanece reservado ao término da série sem dias futuros.
- `ExpenseEditor` e `EarningEditor` limpam sucesso anterior assim que uma nova submissão ou
  exclusão começa. Uma falha posterior não pode coexistir com confirmação antiga de sucesso.
- Regressões Playwright: limite inclusivo do mês e sucesso antigo seguido de escrita
  `unknown`. Suítes dashboard/despesas/ganhos: 23/23 PASS.
- `npm run format:check`, lint web e typecheck web: PASS.

## Handoff após T020 — 2026-09-24

### Estado objetivo

- Progresso: 20/50 tasks concluídas (40%); T011–T020 estão marcadas `[X]`.
- Próxima unidade sequencial: T021, telas privadas de perfil e veículo. T022 fecha o E2E
  dessa história; ganhos só começam em T023 após esse checkpoint.
- Working tree permanece sem commit e contém toda a fundação T001–T020. Não descartar,
  sobrescrever ou separar alterações sem revisar o estado já existente.

### Implementação entregue nesta etapa

- API: guard JWT global com opt-out explícito, consulta da sessão no banco, refresh sem
  rotação, logout idempotente, perfil mínimo, recuperação/reset atômicos e veículo próprio.
- Web: token de acesso somente em memória, refresh único por aba, revalidação em retorno/foco,
  tratamento de resultado incerto, cadastro/login/logout e recuperação/redefinição.
- Testes: provider de e-mail fake fica somente em `apps/api/test/fixtures/e2e-main.ts` e
  entrega o token por mailbox temporária ignorada pelo Git; não existe endpoint de inspeção.
- CI: Playwright foi incluído na web e o workflow instala Chromium antes do E2E essencial.

### Decisões e invariantes a preservar

- O refresh permanece opaco, absoluto por sete dias, sem rotação ou prorrogação; access JWT
  nunca vai para localStorage/sessionStorage. Logout/reset invalidam no servidor.
- Toda mutação autenticada crítica relê a sessão sob lock de User; reset usa a ordem
  User→PasswordResetToken e login relê o hash depois de adquirir o lock de User.
- Resend roda somente depois da persistência e fora de transação/lock. Falha confirmada
  revoga apenas o token correspondente; resposta ao usuário continua genérica.
- `/users/me` não retorna hash/timestamps. Veículo não retorna `userId`, aceita placa nula
  e a ausência de veículo não pode bloquear ganhos, despesas ou dashboard.
- A interface só repete automaticamente uma operação após 401 com `not_applied`; rede
  incerta em escrita é `unknown` e não autoriza reenvio automático.
- Resultados de revalidação são condicionados à versão da operação/credencial; uma resposta
  antiga nunca pode apagar ou substituir login/logout mais recente.

### Validação final reproduzida

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:unit --workspace apps/api`: 3 suítes, 38 testes, PASS.
- `npm run test:integration --workspace apps/api`: 6 suítes, 39 testes, PASS.
- `npm run build`: API e web, PASS.
- Playwright completo: 11/11 PASS em Chromium 1.55 oficial, incluindo 360/390/768/1366 px.
- `actionlint` em `.github/workflows/ci.yml`: PASS.

### Particularidades do ambiente local

- O Playwright 1.55 não fornece Chromium nativo para Ubuntu 26.04. A validação local usou
  `mcr.microsoft.com/playwright:v1.55.0-noble` com rede host, UID/GID 1000 e `HOME=/tmp`.
- Executar container Playwright como root no bind mount pode deixar `.next`, `.test-dist` ou
  resultados sem permissão para o usuário local. Preferir UID/GID 1000 e output em `/tmp`.
- O banco de teste deve ser exatamente `driverfin_test`; algumas execuções no sandbox não
  alcançam `localhost:5433`, exigindo execução autorizada sem mudar DATABASE_URL ou arquitetura.
- Se Turbopack retiver erro de porta/permissão, remover somente `apps/web/.next` e reconstruir.

### Retomada recomendada

1. Confirmar T021 como primeira task aberta em `tasks.md`.
2. Reusar `apiRequest`, `useAuth`, `/users/me`, `/vehicles/me`, `/vehicles/fuels` e
   `POST /vehicles`; não criar uma segunda camada de sessão ou outro cliente HTTP.
3. Implementar perfil somente leitura e formulário/consulta de veículo com estados explícitos.
4. Rodar lint, typecheck e build web; então fechar T022 com Playwright nas quatro larguras.

## T041 — Suíte final automatizada (PASS em 2026-09-25)

- `npm run format:check`: PASS.
- `npm run db:generate --workspace apps/api`: PASS, Prisma Client 7.10.0 gerado.
- `npm run lint`: PASS nos workspaces API e web, sem warnings.
- `npm run typecheck`: PASS nos workspaces API e web.
- `npm run test:unit --workspace apps/api`: 4 suítes, 43 testes, PASS.
- `npm run test:foundation --workspace apps/api`: 1 suíte, 2 testes, PASS com
  PostgreSQL real e resposta sanitizada de indisponibilidade.
- `npm run test:integration --workspace apps/api`: 9 suítes, 62 testes, PASS contra
  `driverfin_test`; migration existente estava aplicada. A suíte cobriu autenticação,
  recuperação, concorrência, isolamento HTTP direto, veículo/perfil, CRUDs e dashboard.
- `npm run build`: PASS para API (Prisma generate + Nest ESM) e web (Next.js, 14 rotas).
  Foi removido somente o cache gerado `apps/web/.next` após o erro ambiental conhecido
  de bind do Turbopack; a reconstrução limpa passou sem alteração de fonte.
- `npm run test:e2e --workspace apps/web`: 42/42 PASS em Chromium 1.55 na imagem oficial
  `mcr.microsoft.com/playwright:v1.55.0-noble`, rede host, UID 1000 e PostgreSQL real.
  A execução nativa anterior não iniciou cenários porque o Chromium não existe para o
  host Ubuntu 26.04; todos os erros ocorreram no launch e foram substituídos pela execução
  oficial bem-sucedida.
- Não foi calculado nem declarado percentual de cobertura. Nenhuma regressão funcional
  foi encontrada e nenhuma funcionalidade foi adicionada.

## T042 — Validação manual consolidada (PASS em 2026-09-25)

| Cenário | Resultado e evidência | Larguras/comportamento |
|---|---|---|
| US1 — acesso | PASS: cadastro, validação/duplicidade normalizada, login válido/inválido, reload/refresh, logout, histórico e contas A/B | 360, 390, 768 e 1366 px; toque e teclado; foco visível; sem overflow |
| US2 — recuperação | PASS no provider fake local: resposta genérica, senha inválida corrigível, senha nova, senha antiga/link repetido/sessões anteriores recusados | 360, 390, 768 e 1366 px; token ausente/inválido e carregamento distintos |
| US3 — perfil/veículo | PASS: perfil mínimo próprio, veículo sem placa, persistência, validação, segundo cadastro e concorrência recusados | 360, 390, 768 e 1366 px; textos longos quebram sem overflow |
| US4 — ganhos | PASS: criar/listar/consultar/editar/excluir/cancelar, zeros, iguais legítimos, inválidos, sessão, duplo toque, resposta incerta e removido | 360, 390, 768 e 1366 px; jornada cronometrada em 3,0 s (≤ 60 s) |
| US5 — despesas | PASS: criar sem descrição, listar/consultar/editar/limpar/excluir/cancelar, inválidos, sessão, duplo toque, resposta incerta e removido | 360, 390, 768 e 1366 px; cada cadastro cronometrado abaixo de 30 s |
| US6 — dashboard | PASS: oito indicadores, três gráficos, cinco recentes, Hoje/Semana/Mês, troca rápida, toque, teclado e retorno após mutação | 360, 390, 768 e 1366 px; valores gráficos também em texto/tabela acessível |

- Casos de borda: PASS para denominadores zero, prejuízo, receita zero, 0,10+0,20,
  entradas negativas/fracionárias inválidas, zeros explícitos, datas vazias/futuras e
  fronteiras de calendário/fuso, edição entre períodos, registro removido, duplo toque,
  resposta perdida, falha confirmada, sessão expirada, identificador alheio, veículo
  concorrente, token no vencimento e textos extensos.
- Estados: loading inicial/filtro, salvando, sucesso, validação, falha de consulta com
  retentativa, falha confirmada, resultado `unknown`, vazios, sessão e removido foram
  observados com feedback distinto; campos não sensíveis permaneceram preenchidos.
- Evidência reproduzível: execução Playwright final de 42/42 cenários contra API e
  PostgreSQL reais, somada à inspeção manual consolidada das jornadas registradas acima.
  Nenhum bug impeditivo ou nova ideia necessária à publicação foi encontrado.
- O envio por e-mail real e a URL pública não pertencem a este gate local; permanecem
  explicitamente reservados a T046/T047.

## T043 — Candidato real de produção (PASS em 2026-09-25)

- `docker build -f apps/api/Dockerfile -t driverfin-api:t043 .`: PASS. O build usou uma
  URL PostgreSQL sintática/inacessível e concluiu, comprovando ausência de dependência do
  banco durante build; nenhuma migration foi executada nessa etapa.
- Runtime ESM: PASS com `CMD ["node", "apps/api/dist/main.js"]`; health respondeu
  `{"status":"ok"}` em `0.0.0.0:3001`, processo executado como usuário não-root.
- Argon2 nativo: hash e verify reais dentro da imagem retornaram `argon2-ok`.
- `npm run db:deploy --workspace apps/api` dentro da imagem: PASS; uma migration
  versionada encontrada, nenhuma pendente, catálogos preservados. Não houve `migrate dev`,
  reset ou seed no smoke.
- Startup sem `DATABASE_URL`: falhou explicitamente com a mensagem sanitizada de variável
  obrigatória. O startup completo também exige WEB_ORIGIN, segredo/claims JWT e, em
  `NODE_ENV=production`, RESEND_API_KEY/RESEND_FROM.
- Logs de build, startup, health e migration foram inspecionados: nenhuma senha, token,
  chave Resend ou connection string completa foi emitida. Prisma informou somente
  host/porta/database locais no smoke.
- TLS: o adapter recebe `DATABASE_URL` sem alterar opções do provedor. O exemplo de env e
  quickstart agora exigem URL privada e o modo TLS documentado pelo serviço (por exemplo,
  `sslmode=require`), sem desabilitar verificação por código.
- Dockerfile preserva Prisma CLI/config/schema/migrations para pre-deploy e é compatível
  com o fluxo Railway planejado: `db:deploy` no pre-deploy; `start:prod` no runtime.
- Pendências operacionais deliberadamente não antecipadas: provisionamento, custos,
  backup/restauração e secrets Railway (T044), origem/cookies públicos (T045) e domínio/
  entrega Resend (T046).

## T044 — Railway PostgreSQL + API (BLOQUEADA em 2026-09-25)

- Verificação local: Railway CLI ausente, nenhum projeto Railway vinculado e
  `RAILWAY_TOKEN` indisponível. Nenhuma credencial foi exibida ou gravada.
- O bloqueio impede confirmar/aceitar capacidade e custo do plano, política de backup e
  restauração, provisionar PostgreSQL 17, configurar secrets, executar o pre-deploy
  remoto, obter URL da API e provar health/restart/persistência em produção.
- O candidato local aprovado em T043 não substitui essas evidências externas. T044 segue
  aberta e, pela ordem obrigatória, T045–T050 não foram iniciadas.
- Para desbloquear sem expor segredos no repositório: disponibilizar uma sessão Railway
  autenticada ou `RAILWAY_TOKEN` no secret store do ambiente, autorizar o plano/custo e
  indicar a política de backup/restauração escolhida. T044 ainda exigirá valores reais e
  válidos de WEB_ORIGIN previsto, RESEND_API_KEY e RESEND_FROM no secret store.
- Procedimentos preparados, ainda não executados remotamente: rollback da aplicação por
  redeploy da imagem/deployment anterior; migrations somente por correção forward com
  nova migration versionada, nunca reset ou `migrate dev` em produção.

## T044–T047 — Deploy e smoke público (PASS em 2026-09-25)

Esta seção substitui o bloqueio operacional anterior de T044. As comprovações externas
abaixo foram executadas manualmente e confirmadas pelo responsável pelo deploy; nenhum
segredo, token ou link de recuperação foi incluído nesta evidência.

### T044 — Railway

- API publicada com o Dockerfile versionado e PostgreSQL provisionado na Railway.
- `DATABASE_URL`, configuração JWT, Resend e `WEB_ORIGIN` foram mantidas no secret store.
- Pre-deploy configurado como `npm run db:deploy --workspace apps/api`; nenhuma migration
  foi executada no build e não foi usado `migrate dev` em produção.
- URL pública: `https://driverfin-production.up.railway.app`.
- `GET https://driverfin-production.up.railway.app/api/health`: HTTP 200 e
  `{"status":"ok"}`; resposta reconfirmada nesta revisão.
- Rollback da aplicação permanece por redeploy do deployment anterior; schema evolui por
  migration corretiva forward versionada, sem reset de produção.

### T045 — Vercel

- Frontend publicado em `https://driver-fin-web-beta.vercel.app`, com Root Directory
  `apps/web`, lockfile da raiz e `API_ORIGIN` apontando para a API HTTPS da Railway.
- `WEB_ORIGIN` foi ajustada para a origem canônica da Vercel; rewrite `/api`, login,
  sessão, refresh/reload e logout foram validados em produção.
- As correções necessárias de engine Node/npm, lockfile e dependência `dotenv` da web
  permanecem versionadas. Build, typecheck e lint passaram depois dessas correções.

### T046 — Resend

- `RESEND_API_KEY` real e `RESEND_FROM` verificado foram configurados fora do Git.
- A recuperação foi solicitada pela aplicação publicada; o e-mail real foi recebido, o
  link abriu na origem correta, a senha foi alterada e o login com a nova senha passou.
- Token/link de recuperação não foi registrado nesta evidência.

### T047 — Smoke público

- PASS manual para cadastro, login, logout, refresh/reload, recuperação, perfil, veículo,
  CRUD de ganhos, CRUD de despesas, dashboard, filtros Hoje/Semana/Mês, oito indicadores,
  três gráficos, últimos lançamentos e persistência.
- Frontend, API e health públicos passaram por HTTPS. Fluxos mobile e desktop foram
  validados. Esta revisão não repetiu a bateria manual já confirmada.

## T048 — README final (PASS em 2026-09-25)

- `readme.md` foi renomeado para `README.md` e reescrito para refletir somente a V1 real.
- O documento contém visão geral, problema/solução, funcionalidades, stack, arquitetura,
  execução local, deploy, decisões, Backlog V2, aviso constitucional e URLs públicas.
- Cinco screenshots reais da aplicação publicada foram capturados com conta de
  demonstração isolada e dados fictícios em `docs/screenshots/`: login, dashboard
  desktop, dashboard mobile, ganhos e despesas. Todas as imagens foram inspecionadas.

## T049 — Checkout limpo e segurança (PASS em 2026-09-25)

Validação executada em clone local isolado em `/tmp`, com um commit temporário contendo
o estado final do README/screenshots. O clone permaneceu limpo após a execução. Foi usado
PostgreSQL 17.11 temporário em `tmpfs`, porta 55433, com bancos descartáveis `driverfin`
e `driverfin_test`; o container foi removido ao final.

Comandos e resultados:

- `npm ci`: PASS, 1064 pacotes instalados pelo lockfile. O audit do npm informou duas
  vulnerabilidades high em dependências; não houve alteração automática ou ampliação de
  escopo nesta tarefa documental.
- Cópia dos três `.env.example`: PASS; arquivos reais permaneceram ignorados pelo Git.
- `docker compose config --quiet`: PASS.
- `npm run db:generate --workspace apps/api`: PASS, Prisma Client 7.10.0.
- `npm run db:deploy --workspace apps/api`: PASS, migration
  `20260924172836_initial_domain` aplicada no banco temporário.
- `npm run db:seed --workspace apps/api`, executado duas vezes: PASS e idempotente;
  comprovados cinco registros em `platforms` e nove em `expense_categories`.
- `npm run format:check`, `npm run lint` e `npm run typecheck`: PASS.
- `npm run build`: PASS para API e web. A primeira tentativa web encontrou a restrição
  ambiental conhecida de bind do Turbopack; após remover somente `apps/web/.next` do
  clone temporário, a reconstrução passou com 14 rotas.
- `npm run test:unit --workspace apps/api`: 4 suítes/43 testes, PASS.
- `npm run test:foundation --workspace apps/api`: 1 suíte/2 testes, PASS.
- `npm run test:integration --workspace apps/api`: 9 suítes/62 testes, PASS.
- Startup compilado: API em 3001 e web em 3000, PASS; `/login`, health direto e health
  pelo rewrite `/api` responderam HTTP 200, com `{"status":"ok"}`.
- `npm run test:e2e --workspace apps/web` no Playwright oficial 1.55: 42/42 PASS,
  incluindo as quatro larguras 360/390/768/1366 px.
- Links verificados: frontend público acessado para as capturas; API health HTTP 200;
  repositório `https://github.com/CaioTelo/DriverFin` HTTP 200.

Auditoria de segurança:

- Somente `.env.example`, `apps/api/.env.example` e `apps/web/.env.example` estão
  versionados; `.env` reais continuaram ignorados.
- Busca nos arquivos versionados não encontrou chave Resend real, token, chave privada,
  senha de produção, secret JWT real ou `DATABASE_URL` real. URLs e secrets encontrados
  pertencem explicitamente a placeholders, fixtures locais ou CI descartável.

## T050 — Definition of Done final (PASS em 2026-09-25)

- Código/funcionalidades: PASS com as evidências T041, T042, T046 e T047 para GitHub,
  autenticação, recuperação, perfil, veículo, CRUDs, dashboard, precisão, divisão por
  zero, estados e isolamento.
- Qualidade: PASS para testes, lint, typecheck, build, quatro larguras e validação manual.
- Produção: PASS para frontend, API, PostgreSQL, HTTPS, health e recuperação real Resend.
- Documentação: PASS para README, screenshots reais, quickstart, links, checkout limpo,
  SC-008 e SC-009.
- Decisão de produto: o responsável retirou explicitamente a publicação em portfólio do
  gate da V1. Ainda não existe um portfólio a atualizar e o DriverFin deixa de ser tratado
  apenas como peça de portfólio, passando a servir também como base para um negócio.
  Portanto, não há link de apresentação a registrar nesta versão e nenhuma URL foi
  inventada. Uma divulgação futura será trabalho posterior à V1.

Todos os requisitos funcionais, de qualidade, produção, documentação, segurança e
reprodutibilidade aplicáveis à V1 estão aprovados. T050 está concluída.

**DriverFin V1 CONCLUÍDA**
