# Pesquisa técnica — DriverFin V1

Data: 2026-09-08. Base: [spec.md](spec.md) e constituição v1.0.0.
As decisões abaixo são de implementação, sem alteração de requisitos funcionais.
Documentação consultada via Context7, com resolução de IDs antes das consultas,
e consulta web oficial complementar para compatibilidade e serviços de deploy.

## 1. Monorepo e versões de referência

**Decisão:** npm workspaces, somente `apps/web` e `apps/api`, raiz privada e um lockfile.
Base de compatibilidade: Node.js 24 LTS, npm 11, TypeScript 5.9, Next.js 16,
React 19, Tailwind CSS 4, Recharts 3, NestJS 11, Prisma 7 e PostgreSQL 17.
Fixar patches estáveis compatíveis no lockfile na fundação e a mesma versão Node em
ambiente local, CI, Docker e provedores; não usar versões canary ou atualizar majors
automaticamente. shadcn/ui fornece código de componentes apenas em `apps/web`.

**Justificativa:** duas aplicações independentes com instalação reproduzível, sem
orquestrador adicional. Essas são linhas escolhidas para o projeto, não uma afirmação
sobre o patch mais recente de cada produto. A fundação verificará build conjunto.

**Alternativas:** Nx/Turborepo e packages compartilhados preventivos aumentam manutenção;
não há reutilização real que os justifique. Tipos de transporte locais e contratos
versionados bastam; não exportar DTOs Nest ou modelos Prisma ao frontend.

Fontes: [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces),
[Node releases](https://nodejs.org/en/about/previous-releases),
[Next instalação](https://nextjs.org/docs/app/getting-started/installation).

## 2. Prisma 7 e dados

**Decisão:** `prisma-client` com saída em `apps/api/src/generated/prisma`,
`moduleFormat = "esm"` para backend ESM compatível com Node.js 24, NestJS 11 e Prisma 7,
`@prisma/adapter-pg` e `pg`. Usar `"type": "module"` no package.json da API,
`module: "NodeNext"` e `moduleResolution: "NodeNext"`, preservando decorators conforme
plan.md; gerar TypeScript com imports `.js` para execução do artefato compilado.
Na fundação, validar `prisma generate`, build NestJS, execução de `dist/main.js` e
build/startup da imagem Docker. CommonJS não integra a configuração aprovada da V1.
Configuração da CLI em `apps/api/prisma.config.ts`, incluindo carregamento explícito de
ambiente, schema, migrations, seed e URL. PrismaService único no processo.

**Justificativa:** evita misturar configuração da geração antiga com Prisma 7.
Usar PostgreSQL real também nos testes de integração. Datas financeiras serão `date`;
metadados e expirações, `timestamptz`. Prisma Decimal representa o transporte para colunas
NUMERIC; dinheiro nunca passa por `number` antes da persistência.

**Alternativas:** SQLite para integração não reproduz constraints, locks ou semântica
numérica de produção; mudar ORM ou introduzir repository genérico não traz benefício.

Fontes: [receita oficial Nest/Prisma](https://docs.nestjs.com/recipes/prisma),
[tutorial Prisma com NestJS](https://www.prisma.io/blog/nestjs-prisma-rest-api-7D056s1BmOL0),
[tipos numéricos PostgreSQL](https://www.postgresql.org/docs/current/datatype-numeric.html).

## 3. Sessões e transporte de credenciais

**Decisão:** access JWT de 15 minutos em memória do navegador; refresh opaco de 32 bytes
aleatórios, hash SHA-256 no PostgreSQL, validade absoluta de sete dias, sem rotação nesta
V1. Cookie de refresh HttpOnly, Secure em produção, SameSite=Lax, sem Domain, Path=/api/auth.
AuthSession liga refresh e JWT pelo `sid`; guard verifica sessão não revogada/não expirada
em toda chamada protegida. Senhas com Argon2id, salt automático, memória de 64 MiB, três iterações e paralelismo 1;
validar custo e compatibilidade no container de produção.

**Justificativa:** JWT sem estado de sessão não cumpre revogação imediata exigida pelo
spec. Sete dias e 15 minutos são escolhas técnicas, sem nova tela ou configuração.
Refresh sem rotação atende à especificação e evita conflito entre abas; perda de um token
permanece risco até expiração/revogação, mitigado por cookie restrito e hash no banco.

**Alternativas:** localStorage expõe refresh a scripts; cookies cross-site entre domínios
padrão dos provedores dependem de políticas de terceiros; Redis está proibido.
Rotação de refresh e lista de dispositivos não são necessárias para os requisitos atuais.

Fontes: [Nest autenticação](https://docs.nestjs.com/security/authentication),
[cookies HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie),
[node-argon2](https://github.com/ranisalt/node-argon2).
Os tempos, algoritmo de senha e desenho de sessão são decisões do projeto.

## 4. Concorrência da autenticação e recuperação

**Decisão:** tabelas técnicas AuthSession e PasswordResetToken são necessárias para
revogação, expiração e uso único. Login, emissão de reset e consumo de reset serializam
alterações da mesma conta com lock de User em transação curta. Login relê o hash sob
lock caso a verificação cara tenha ocorrido antes. Reset valida DTO antes de consumir;
consome token, atualiza senha, invalida links pendentes e revoga sessões atomicamente.
Refresh e logout também seguem a ordem de lock User → sessão quando alteram estado.

**Justificativa:** impede que login concorrente recrie sessão com senha anterior ou que
dois resets aceitem o mesmo link. Token é válido apenas se `expiresAt > now`.
Operações protegidas de escrita revalidam sessão dentro da transação antes da alteração;
logout/reset compartilham o lock User para serializar autorização com gravação.

**Alternativas:** checar token e atualizar em operações independentes tem corrida.
Lock local em memória não protege processos diferentes. Não executar hash caro, chamadas
Resend ou outras operações de rede segurando lock; reler condições antes de confirmar.

Fonte: [transações Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).

## 5. Resend exclusivamente para recuperar senha

**Decisão:** provider de envio concreto dentro de auth; envio síncrono após persistir
hash de token, sem filas. Link com token em fragmento da URL de redefinição, removido do
endereço após leitura no navegador. Link expira em 30 minutos e não é consumido por GET.
Resposta genérica 202 para solicitações válidas, inclusive conta inexistente e erro do
provedor; registrar falhas internamente sem segredos. Mensagem pública não garante entrega.

**Justificativa:** domínio remetente verificado e DNS são dependências reais da publicação,
não nova capacidade. O token puro existe apenas em memória e no link enviado.
Em falha confirmada de envio, revogar aquele token; não revogar outros pedidos válidos.

**Alternativas:** notificações, confirmação de e-mail, webhooks e templates sofisticados
não fazem parte do MVP. Testes usam substituição do provider, não outro serviço produtivo.

Fontes: [Resend Node](https://resend.com/docs/send-with-nodejs),
[verificação do remetente](https://resend.com/docs/knowledge-base/403-error-domain-mismatch).

## 6. Cálculos exatos e calendário

**Decisão:** agregar NUMERIC no PostgreSQL; transformar somas de duas casas em inteiros
BigInt em centavos ou centésimos de hora/km. Um módulo puro de domínio da API calcula
lucro e razões por divisão inteira com resto, arredondando empate para longe de zero.
JSON contém strings de duas casas; `null` e motivo representam denominador zero.

**Justificativa:** obtém arredondamento exato de razões sem dependência adicional nem
precisão arbitrária de ponto flutuante. Prisma Decimal permanece na leitura/escrita;
BigInt não é serializado diretamente. Não há regra financeira compartilhada com a web.

**Decisão de calendário:** função única recebe relógio e converte o instante atual em
ano/mês/dia de America/Sao_Paulo por Intl. Aritmética de calendário usa componentes UTC
apenas como ferramenta, sem converter datas financeiras em horários locais. Segunda a
domingo e mês completos são intervalos inclusivos. Evolução termina em hoje.

**Alternativas:** média de razões, `parseFloat` e arredondamento por lançamento violam
RN-007/008; adicionar biblioteca de datas não é necessário para três intervalos fixos.
Regras e fórmulas derivam diretamente de RN-005 a RN-008 do spec.

## 7. UI, formulários e gráficos

**Decisão:** App Router com páginas públicas e shell privado; estado local React e fetch
para REST. shadcn/ui copiado localmente, sem design system adicional. Campos numéricos
permanecem strings; normalização de vírgula para ponto é só de transporte. Recharts em
componentes cliente com contêiner de altura explícita, largura fluida e valores textuais.

**Justificativa:** preserva formulários curtos e separa entrada, cálculo e apresentação.
Cancelar/ignorar consultas antigas ao trocar filtro evita mostrar períodos misturados.
Gráficos exigem teste por toque; não presumir que `Tooltip trigger="click"` cobre mobile.
Valores em legenda/lista acessível complementam a consulta por toque.

**Alternativas:** Redux, biblioteca de cache remoto, formulário genérico, SSR de dados
privados e BFF de domínio não são necessários. Hooks pequenos por fluxo bastam.

Fontes: [React input](https://react.dev/reference/react-dom/components/input),
[React efeitos e corridas](https://react.dev/learn/synchronizing-with-effects),
[Tailwind responsividade](https://tailwindcss.com/docs/responsive-design),
[shadcn Tailwind 4](https://ui.shadcn.com/docs/tailwind-v4),
[Recharts 3](https://github.com/recharts/recharts/wiki/3.0-migration-guide),
[toque em Recharts](https://github.com/recharts/recharts/blob/main/src/state/touchEventsMiddleware.ts).

## 8. Deploy e mesma origem

**Decisão:** Vercel web, Railway API e PostgreSQL no mesmo projeto/região.
Navegador chama `/api`; rewrite encaminha para a origem fixa NestJS, sem reimplementar
endpoints. Respostas privadas/auth com `Cache-Control: private, no-store`, sem cache do
rewrite. Validar encaminhamento de Authorization, Cookie e Set-Cookie em deploy real.

**Justificativa:** utiliza domínios padrão dos provedores, sem obrigar domínio web próprio
ou cookies de terceiros. API permanece aplicação separada e funciona independentemente.
CORS com lista explícita e Origin validado para ações de cookie; CORS não é autorização.

**Alternativas:** API+Neon adiciona fornecedor sem necessidade atual; Render é alternativa
constitucional, sem motivo concreto para trocar Railway. Não presumir gratuidade: custo,
recursos, backups e disponibilidade do serviço devem ser conferidos antes de contratar.

Fontes: [Next rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites),
[Vercel rewrites](https://vercel.com/docs/routing/rewrites),
[Railway monorepo](https://docs.railway.com/deployments/monorepo),
[Railway pre-deploy](https://docs.railway.com/deployments/pre-deploy-command).

## 9. Validação proporcional

**Decisão:** Jest no backend para funções puras; Jest + Supertest com PostgreSQL real
para integração; Playwright para poucas jornadas completas e estados de rede. Compose
sobe somente PostgreSQL local, com volume e healthcheck; não acrescenta serviço à V1.

**Justificativa:** prioriza resultados financeiros, autorização e fluxos públicos, sem
meta de cobertura arbitrária. Manual cobre larguras 360/390/768/1366 e tempo de cadastro.

**Alternativas:** mock de banco como único teste não valida constraints nem concorrência;
end-to-end de toda combinação torna a suíte desnecessariamente cara.

Fontes: [Nest testing](https://docs.nestjs.com/fundamentals/testing),
[Playwright web servers](https://playwright.dev/docs/test-webserver),
[Docker startup order](https://docs.docker.com/compose/how-tos/startup-order/).

## Pontos de decisão e conclusão

Nenhuma decisão funcional em aberto e nenhum desvio constitucional identificado.
Domínio/DNS do Resend, credenciais, URLs efetivas e contratação dos provedores são
pré-requisitos operacionais para deploy, não bloqueios para decompor a implementação.
As capacidades de perfil somente leitura e veículo somente cadastro/consulta foram
preservadas. Se limites operacionais exigirem mudança funcional, registrar proposta e
avaliar antes de alterar spec; não adicionar capacidades silenciosamente.
