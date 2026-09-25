# Napkin Runbook

## Curation Rules
- Reordenar em cada leitura; manter apenas orientações recorrentes.
- Máximo de 10 itens por categoria; incluir data e ação explícita.

## Execution & Validation (Highest Priority)
1. **[2026-09-24] Formatação é um gate reproduzível, não revisão visual opcional**
   Do instead: escrever TypeScript/TSX legível, executar `npm run format` após alterações
   e exigir `npm run format:check` no CI antes de considerar lint/typecheck suficientes.
2. **[2026-09-24] Smoke da imagem deve reproduzir o ambiente obrigatório de produção**
   Do instead: ao executar a imagem com `NODE_ENV=production`, fornecer DATABASE_URL,
   PORT, WEB_ORIGIN, JWT_ACCESS_SECRET/ISSUER/AUDIENCE e RESEND_API_KEY/FROM antes do health.
3. **[2026-09-08] Constituição orienta os artefatos do Spec Kit**
   Do instead: consultar `.specify/memory/constitution.md` e o plano vigente antes de
   especificar ou implementar; manter os templates alinhados ao alterar a governança.
4. **[2026-09-09] Prisma 7 gera client sem modelos e sem acessar o banco**
   Do instead: executar `db:generate` antes de typecheck/build; manter generator ESM/ts
   com imports js e não usar a opção removida `--allow-no-models`.
5. **[2026-09-09] Testes ESM preservam a compilação usada no runtime**
   Do instead: usar os scripts Jest que compilam com TypeScript/NodeNext e decorators;
   reservar `driverfin_test` aos smokes, sem reutilizar bancos de outros projetos.
6. **[2026-09-25] Retomar o fechamento em T044 sem antecipar gates externos**
   Do instead: preservar T001–T043 concluídas; provisionar Railway primeiro e só avançar
   a Vercel, Resend, smoke, README e DoD após cada comprovação real na ordem T044→T050.

## Shell & Command Reliability
1. **[2026-09-09] Turbopack pode reter falha de permissão no cache**
   Do instead: se o build falhar ao abrir porta interna no sandbox, executar com permissão;
   se persistir a mesma falha, parar a web, limpar somente `apps/web/.next` e reconstruir.
2. **[2026-09-09] Compatibilidade de ESLint precisa de execução real**
   Do instead: manter ESLint 9 na web enquanto o plugin React do Next 16.3.4 exigir APIs
   removidas no ESLint 10; não inferir compatibilidade apenas pelo peer do eslint-config-next.
3. **[2026-09-09] Next dev pode gerar instruções adicionais automaticamente**
   Do instead: manter `agentRules: false` na configuração web para preservar AGENTS.md
   da raiz e os artefatos de governança do Spec Kit.
4. **[2026-09-24] Playwright local requer container no Ubuntu 26.04**
   Do instead: usar `mcr.microsoft.com/playwright:v1.55.0-noble` com rede host,
   `--user 1000:1000`, `HOME=/tmp` e resultados em `/tmp`; nunca gerar caches como root.
5. **[2026-09-24] PostgreSQL local pode ficar inacessível no sandbox**
   Do instead: ao receber P1001 em `localhost:5433` com o container saudável, repetir a
   suíte com permissão; manter `TEST_DATABASE_URL` restrita ao banco `driverfin_test`.

## Domain Behavior Guardrails
1. **[2026-09-24] Falha de transporte não comprova expiração da sessão**
   Do instead: limpar credenciais e redirecionar apenas após 401 definitivo; em rede/5xx,
   preservar sessão, ocultar dados privados, exibir indisponibilidade e oferecer nova tentativa.
2. **[2026-09-08] Entregar a V1 antes de ampliar o produto**
   Do instead: classificar mudanças pelo escopo constitucional, adiar melhorias e
   registrar novas capacidades no Backlog V2.
3. **[2026-09-24] Sessão e concorrência usam locks concretos de User**
   Do instead: manter access token só em memória, refresh absoluto sem rotação e ordem de
   lock User→recurso; reler sessão/hash dentro da transação antes de qualquer mutação.
4. **[2026-09-24] Escrita incerta nunca é reenviada automaticamente**
   Do instead: repetir uma vez apenas 401 explícito com `not_applied`; para `unknown`, limpar
   dados sensíveis quando aplicável e orientar consulta antes de uma nova tentativa.
5. **[2026-09-24] Revalidação antiga não pode vencer autenticação recente**
   Do instead: preservar o versionamento de operações no AuthProvider e de credenciais no
   api-client; cobrir refresh lento seguido de login com a regressão Playwright.
