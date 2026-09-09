# Quickstart de validação — DriverFin V1

Este é o contrato de execução **a implementar** nas próximas etapas. Hoje o repositório
contém artefatos de planejamento: os aplicativos e scripts npm abaixo ainda não existem.
Não executar os comandos até a fundação disponibilizá-los; a entrega deve tornar este
guia reproduzível e ajustar nomes apenas se os artefatos forem atualizados conjuntamente.

Referências: [plano](plan.md), [modelo](data-model.md), [REST](contracts/rest-api.md),
[especificação e resultados de aceite](spec.md).

## Pré-requisitos

Node.js 24 LTS na versão de `.nvmrc`, npm 11, Docker com Compose e Git. Instalação de
primeira fundação gera um package-lock.json na raiz; instalações posteriores usam npm ci.
Portas locais: web 3000, API 3001 e PostgreSQL 5433. Não reutilizar banco de outro projeto.

Para recuperação manual real: conta Resend, chave de envio, domínio remetente verificado
e destinatário acessível. Testes automatizados usam provider fake injetado pelo harness;
nenhum segredo ou link de recuperação é publicado em logs ou endpoints de teste produtivos.

## Contrato dos scripts npm

| Workspace | Script | Comportamento a disponibilizar |
|-----------|--------|--------------------------------|
| Raiz | lint | ESLint dos dois workspaces, sem depender de next lint. |
| Raiz | typecheck | Verificação TypeScript de ambos. |
| Raiz | build | Build api e web sequencialmente; API gera Prisma antes de compilar. |
| apps/api | dev | Nest start --watch na porta local configurada. |
| apps/api | build | prisma generate seguido de nest build; saída executável dist/main.js. |
| apps/api | start:prod | node dist/main.js. |
| apps/api | db:generate | prisma generate. |
| apps/api | db:dev | prisma migrate dev para desenvolvimento de migrations. |
| apps/api | db:deploy | prisma migrate deploy, aplica somente migrations versionadas. |
| apps/api | db:seed | prisma db seed, catálogos idempotentes, sem dados pessoais reais. |
| apps/api | test:unit | Jest unitários, sem serviços externos. |
| apps/api | test:integration | Harness verifica TEST_DATABASE_URL, prepara banco de teste, migrations e executa Jest/Supertest. |
| apps/web | dev | next dev. |
| apps/web | build | next build. |
| apps/web | start | next start. |
| apps/web | test:e2e | Playwright inicia web e API de teste, aplica migrations e usa provider fake. |

Scripts de teste recusam banco produtivo e exigem database `driverfin_test` no ambiente
local/CI; preparação pode limpar exclusivamente esse banco. TEST_DATABASE_URL é propagada
como DATABASE_URL apenas nos processos de teste, sem modificar `.env` de desenvolvimento.
A configuração Nest compila a partir de src; client Prisma gerado dentro de src mantém
entrada dist/main.js. Migrações e config permanecem disponíveis para db:deploy na imagem.

## Preparar ambiente local

Na raiz do checkout, depois de implementados os workspaces:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm ci
docker compose up -d --wait db
npm run db:generate --workspace apps/api
npm run db:deploy --workspace apps/api
npm run db:seed --workspace apps/api
```

Preencher variáveis antes de subir as aplicações:

- Compose: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB=driverfin; porta 5433 externa.
- API: DATABASE_URL para driverfin em localhost:5433, PORT=3001,
  WEB_ORIGIN=http://localhost:3000, NODE_ENV=development, JWT_ACCESS_SECRET forte,
  JWT_ISSUER=driverfin-api, JWT_AUDIENCE=driverfin-web, RESEND_API_KEY e RESEND_FROM válidos.
- Web: API_ORIGIN=http://localhost:3001. O browser chama /api, sem URL secreta pública.
- Testes: TEST_DATABASE_URL apontando para driverfin_test, separado de driverfin.

Compose define volume e healthcheck do db. O harness cria/prepara driverfin_test com
credencial local autorizada; nunca tenta criar ou resetar banco de produção.
Para desenvolver alterações de schema, usar db:dev com nome de migration e revisar seu
SQL; para executar projeto já migrado, db:deploy é suficiente. Catálogos já são criados
pela migration, e rodar seed novamente não os duplica.

Dois terminais, a partir da raiz:

```bash
npm run dev --workspace apps/api
```

```bash
npm run dev --workspace apps/web
```

Abrir http://localhost:3000/login. `/api/health` pela web deve chegar à API e responder
status ok; indisponibilidade do banco deve responder 503 sem expor conexão ou stack.

## Verificações automatizadas

```bash
npm run lint
npm run typecheck
npm run test:unit --workspace apps/api
npm run test:integration --workspace apps/api
npm run build
npm exec --workspace apps/web -- playwright install chromium webkit
npm run test:e2e --workspace apps/web
```

Esperado: comandos aprovados, nenhuma conexão ao banco de produção, cenários críticos
cobertos conforme plano. No CI, instalar dependências de sistema dos navegadores conforme
Playwright e executar com banco de serviço isolado. Não usar conta Resend real em CI.

## Cenários reproduzíveis de aceite

### 1. Acesso, perfil e veículo

Criar duas contas A/B com e-mails diferentes; cadastro não deve exigir telefone/documento.
Repetir e-mail com maiúsculas: rejeitar. Login correto abre dashboard; incorreto mostra
mensagem genérica. Perfil de A mostra apenas nome/e-mail de A.

Cadastrar veículo de A sem placa; reabrir deve mostrar os campos. Novo cadastro, inclusive
duas solicitações simultâneas, deixa apenas um veículo. B não vê veículo de A. Antes de
cadastrar veículo, ganhos/despesas já devem estar disponíveis.

### 2. Precisão e dashboard

Usar a data de hoje em America/Sao_Paulo. Para A, cadastrar ganho Uber de R$ 300,00,
12 corridas, 6 horas e 100 km; cadastrar despesa Combustível de R$ 120,00, sem descrição.
No filtro Hoje, esperar receita 300,00; despesas 120,00; lucro 180,00; margem 60,00%;
receita/hora 50,00; lucro/hora 30,00; receita/km 3,00; lucro/km 1,80.
Conferir distribuição e evolução com os mesmos valores e os últimos lançamentos.

Editar a despesa para 150,00: lucro passa a 150,00 e margem a 50,00 na próxima consulta.
Excluir com confirmação remove sua contribuição; cancelar exclusão preserva o registro.
Recarregar confirma persistência. B continua sem esses lançamentos.

Em fixtures separadas, verificar R$ 0,10+R$ 0,20 = R$ 0,30; receita sem horas/km mostra “—”
nas razões respectivas; somente despesas de 50,00 mostram lucro -50,00 e margem “—”.
Asserções unitárias incluem empates como ±0,005 → ±0,01, razões de totais e limites físicos.

### 3. Calendário e últimos lançamentos

Teste automatizado injeta instante `2026-09-08T15:00:00Z`: Hoje é 08/09, Semana é
07/09–13/09, Mês é 01/09–30/09, evolução termina em 08/09. Preparar registros nas bordas,
fora do período e de B. Nenhum registro fora do intervalo ou de B entra nos resultados.
Criar mais de cinco lançamentos e verificar ordem por data, criação e desempate estável.

Testar instante `2026-09-08T02:59:59Z`: ainda é 07/09 em São Paulo. Cobrir também
segunda/domingo, virada de ano e fevereiro bissexto. Datas de lançamento não mudam ao
usar navegador em outro fuso. Alterar rapidamente filtros não mistura cards/gráficos.

### 4. Recuperação e revogação

Solicitar link para conta existente e inexistente: mesma mensagem e status público.
No teste, capturar link pelo provider fake no harness; manualmente, ler caixa real.
Abrir link não consome token. Senha inválida permite corrigir; senha válida troca acesso,
invalida links pendentes, senha anterior e todas as sessões anteriores, incluindo JWT
não expirado. Link usado ou exatamente no vencimento é recusado.

Concorrência automatizada: dois usos do mesmo link têm no máximo um sucesso; login com
senha antiga concorrendo com reset não cria sessão válida após reset concluído.
Logout com access expirado e refresh válido encerra a sessão; voltar pelo histórico não
reexibe dados sem revalidar. Confirmar também autorização nas chamadas HTTP diretas.

### 5. Estados e responsividade

Validar todas as jornadas em 360, 390, 768 e 1366 pixels. Conferir campos, ações de edição,
listas, texto extenso, navegação e gráficos. Toque deve permitir consultar valores; teclado
mantém foco identificável. Nenhuma rolagem horizontal da página por layout evitável.

Com dados à mão e conexão funcional, cronometrar despesa em até 30 segundos e ganho em
até 60 segundos. Confirmar ausência de etapas adicionais e descrição opcional.

Simular erro de leitura, validação, 401, registro removido e resposta perdida após envio.
Antes da resposta não há zeros como resultado confirmado. Duplo toque enquanto pendente
não reenvia. Resultado incerto orienta consultar a lista e não anuncia sucesso ou falha
confirmada. Falhas conhecidas preservam valores não sensíveis. Registrar evidências de SC-007.

## Validação da publicação

Configurar Vercel/Railway/Resend conforme plano. Executar migrate deploy na etapa pre-deploy,
não migrate dev. Conferir URL, banco, health, cookie HttpOnly/Secure/SameSite e ausência de
cache privado, passando por /api publicado. Testar refresh no reload, logout e reset no
navegador mobile; não aceitar funcionamento apenas em localhost.

Realizar jornada completa com conta de teste própria e envio Resend para destinatário
real. Confirmar domínio remetente, link com WEB_ORIGIN correta e validade de 30 minutos.
README deve conter instruções realmente executadas, screenshots atuais, link funcional
e aviso de portfólio. Registrar evidências de testes/deploy/README nas tarefas futuras
antes de marcar DoD constitucional como concluída.
