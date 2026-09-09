# Modelo de dados — DriverFin V1

Referências: [spec.md](spec.md), [plan.md](plan.md) e [contrato REST](contracts/rest-api.md).
Destino de implementação: `apps/api/prisma/schema.prisma` e migrations versionadas.
Este documento define o modelo Prisma; não cria schema, migrations ou banco nesta etapa.

## Convenções

- Modelos Prisma em PascalCase, campos camelCase, tabelas/colunas físicas snake_case
  com `@@map`/`@map`. IDs UUID gerados no backend, `String @db.Uuid`.
- `createdAt` e `updatedAt`: `DateTime @db.Timestamptz(3)`; `createdAt @default(now())`,
  `updatedAt @updatedAt`. Datas financeiras: `DateTime @db.Date`, sem horário de atividade.
- Valores: `Decimal @db.Decimal(65,2)` para dinheiro e km; nunca Float/Double.
  Isso admite 63 algarismos inteiros e duas casas. Limites físicos são validados com
  erro de campo, sem truncamento; não constituem meta, plano pago ou limite comercial.
- Contagem de corridas: `Int`, entre 0 e 2.147.483.647 (limite físico PostgreSQL).
  Horas: `Decimal @db.Decimal(4,2)`, entre 0 e 24 por registro.
- API recebe strings decimais, valida no máximo duas casas ANTES de construir Decimal.
  NUMERIC com escala pode arredondar na entrada; portanto constraint após coerção não
  substitui essa validação. Nenhum número especial (NaN/Infinity) é aceito.
- Nenhum campo de propriedade vem do formulário: `userId` é sempre da sessão validada.
- Tipos e faixas repetem RN-001 a RN-005; capacidade física não introduz campo ou fluxo.

## User → users

| Campo Prisma | Tipo/restrição | Finalidade |
|--------------|----------------|------------|
| id | UUID, PK | Identidade técnica |
| name | String, VarChar(100), obrigatório | Nome 1–100 após trim |
| email | String, VarChar(254), unique, obrigatório | E-mail normalizado trim + lowercase |
| passwordHash | String, Text, obrigatório | Argon2id, nunca senha pura |
| createdAt / updatedAt | Timestamptz(3) | Metadados |

Relacionamentos: `vehicle Vehicle?`, `earnings Earning[]`, `expenses Expense[]`,
`sessions AuthSession[]`, `passwordResetTokens PasswordResetToken[]`.
CHECK de nome não vazio e e-mail canônico `email = lower(btrim(email))` por migration;
formato de e-mail e senha na validação da aplicação. Unique email resolve também corrida
de cadastro. Nenhuma edição/exclusão de usuário exposta na V1.

## Vehicle → vehicles

| Campo Prisma | Tipo/restrição |
|--------------|----------------|
| id | UUID, PK |
| userId | UUID, FK User, unique |
| brand | String, VarChar(100), obrigatório |
| model | String, VarChar(100), obrigatório |
| year | Int, obrigatório |
| fuel | enum Fuel, obrigatório |
| plate | String?, VarChar(10) |
| createdAt / updatedAt | Timestamptz(3) |

`@@unique`/`@unique` de userId garante **no máximo um veículo** mesmo com concorrência.
Marca/modelo não vazios após trim. Ano >=1900 no banco; teto ano corrente+1 na aplicação
com relógio do produto, evitando CHECK dependente de passagem do tempo. Placa não tem
unicidade global e pode ser nula. Sem FK de lançamentos para veículo; ausência de veículo
não bloqueia finanças. FK User com `onDelete: Restrict`, `onUpdate: Cascade`.

Fuel é enum PostgreSQL/Prisma, sem tabela própria:

| Código | Rótulo |
|--------|--------|
| GASOLINE | Gasolina |
| ETHANOL | Etanol |
| FLEX | Flex |
| DIESEL | Diesel |
| CNG | GNV |
| ELECTRIC | Elétrico |
| HYBRID | Híbrido |
| OTHER | Outro |

## Platform → platforms

`id String @id @db.VarChar(20)`, `name String @unique @db.VarChar(30)`, `sortOrder Int`.
IDs estáveis: UBER → Uber; NINETY_NINE → 99; INDRIVE → inDrive;
PRIVATE → Particular; OTHER → Outro. Ordem 1–5 conforme spec.
Relação `earnings Earning[]`. Sem owner e sem endpoints de alteração.

## ExpenseCategory → expense_categories

`id String @id @db.VarChar(30)`, `name String @unique @db.VarChar(30)`, `sortOrder Int`.
IDs estáveis e ordem 1–9:

| ID | Nome |
|----|------|
| FUEL | Combustível |
| MAINTENANCE | Manutenção |
| INSURANCE | Seguro |
| WASH | Lavagem |
| TOLL | Pedágio |
| PARKING | Estacionamento |
| FOOD | Alimentação |
| FINANCING | Financiamento |
| OTHER | Outros |

Relação `expenses Expense[]`. Sem owner e sem endpoints de alteração.

## Earning → earnings

| Campo Prisma | Tipo/restrição |
|--------------|----------------|
| id | UUID, PK |
| userId | UUID, FK User, obrigatório |
| date | DateTime @db.Date, obrigatório |
| platformId | String VarChar(20), FK Platform, obrigatório |
| amount | Decimal(65,2), obrigatório, >0 |
| rides | Int, obrigatório, >=0 |
| hours | Decimal(4,2), obrigatório, 0–24 |
| kilometers | Decimal(65,2), obrigatório, >=0 |
| createdAt / updatedAt | Timestamptz(3) |

Índice composto `@@index([userId, date(sort: Desc), createdAt(sort: Desc), id(sort: Desc)])`
para intervalo de datas e lista ordenada. Índice platformId para FK.
CHECKs amount >0, rides >=0, hours entre 0 e 24, kilometers >=0 e exclusão de NaN para
todas as colunas NUMERIC; validação rejeita Infinity antes de persistir.
Não há unique em data/plataforma. Não há constraint de soma diária de horas ou deduplicação
por conteúdo. Datas futuras são rejeitadas na aplicação usando America/Sao_Paulo.
FK User e Platform com `onDelete: Restrict`, `onUpdate: Cascade`.

## Expense → expenses

| Campo Prisma | Tipo/restrição |
|--------------|----------------|
| id | UUID, PK |
| userId | UUID, FK User, obrigatório |
| date | DateTime @db.Date, obrigatório |
| categoryId | String VarChar(30), FK ExpenseCategory, obrigatório |
| amount | Decimal(65,2), obrigatório, >0 e diferente de NaN |
| description | String?, VarChar(500) |
| createdAt / updatedAt | Timestamptz(3) |

Índice composto `@@index([userId, date(sort: Desc), createdAt(sort: Desc), id(sort: Desc)])`
e índice categoryId. CHECK amount >0 e exclusão de NaN. Data futura rejeitada na aplicação.
FKs User/ExpenseCategory com `onDelete: Restrict`, `onUpdate: Cascade`.
Descrição omitida ou vazia é armazenada como null, sem obrigatoriedade em Outros.

## AuthSession → auth_sessions (entidade técnica necessária)

| Campo Prisma | Tipo/restrição | Finalidade |
|--------------|----------------|------------|
| id | UUID, PK | Claim sid do JWT |
| userId | UUID, FK User | Proprietário da sessão |
| refreshTokenHash | String, Char(64), unique | SHA-256 do refresh opaco |
| expiresAt | Timestamptz(3), obrigatório | Criação + sete dias absolutos |
| revokedAt | Timestamptz(3)? | Logout ou reset |
| createdAt | Timestamptz(3) | Emissão |

FK User `onDelete: Cascade`, `onUpdate: Cascade`; índices userId e expiresAt.
CHECK expiresAt > createdAt. Não armazena refresh puro, JWT, IP ou dispositivo.
Sessão válida: existe, corresponde a sub/sid, revokedAt null e expiresAt > agora.
Não renova a validade absoluta a cada refresh. Mesmo JWT não expirado perde autorização
quando a sessão é revogada. Sem rotação de refresh e sem tabela extra de histórico.

## PasswordResetToken → password_reset_tokens (entidade técnica necessária)

| Campo Prisma | Tipo/restrição | Finalidade |
|--------------|----------------|------------|
| id | UUID, PK | Identidade técnica |
| userId | UUID, FK User | Conta a recuperar |
| tokenHash | String, Char(64), unique | SHA-256 de segredo aleatório de 32 bytes |
| expiresAt | Timestamptz(3), obrigatório | Criação + 30 minutos |
| usedAt | Timestamptz(3)? | Consumo bem-sucedido |
| revokedAt | Timestamptz(3)? | Invalidação por reset ou falha confirmada de envio |
| createdAt | Timestamptz(3) | Emissão |

FK User `onDelete: Cascade`, `onUpdate: Cascade`; índices userId e expiresAt.
CHECK expiresAt > createdAt. Válido se usedAt e revokedAt nulos e expiresAt > agora.
Pode haver mais de um link pendente; consumir um revoga todos os outros da conta.
Senha inválida não consome o token. Leitura do link/GET não altera estado.

## Transições e atomicidade

| Operação | Efeito atômico esperado |
|----------|------------------------|
| Cadastro | Criar User com e-mail único; nenhum login automático obrigatório. |
| Login | Verificar hash atual sob serialização com reset e criar AuthSession. |
| Refresh | Validar sessão e emitir access JWT; não prorrogar/rotacionar refresh. |
| Logout | Revogar sessão identificada pelo refresh válido ou pelo JWT verificável; limpar cookie. |
| Solicitar recuperação | Persistir hash/expiração; enviar Resend depois de confirmar transação. |
| Redefinir senha | Validar link sob lock User, marcar usado, trocar hash, revogar demais links e todas as sessões. |
| Criar veículo | INSERT único; violação userId unique vira 409, sem segundo veículo. |
| Editar ganho/despesa | UPDATE filtrado por id e userId; nenhum upsert. |
| Excluir ganho/despesa | DELETE físico filtrado por id e userId; sem soft-delete, lixeira ou histórico. |

Locks seguem ordem User → sessão/token/registro. Para mutações privadas, sessão é
revalidada na mesma transação após lock User; logout/reset usam o mesmo lock. Não manter
transação aberta enquanto chama Resend ou calcula hash de senha. Quando hash é calculado
antes do lock, reler condições sob lock antes de confirmar. Leituras já autorizadas em
andamento podem terminar; requisições iniciadas após revogação concluída são negadas.

## Migrations, catálogo e exclusão

Prisma Migrate versiona schema, índices e constraints. CHECKs que não forem representáveis
no schema Prisma entram no SQL da migration gerada e revisada; nunca alteração manual
não documentada em produção. Migration inicial insere catálogos com IDs estáveis.
Seed local/teste usa upsert idempotente dos mesmos valores, sem excluir referências.
Produção usa `prisma migrate deploy`; seed com dados fictícios nunca roda em produção.

Os únicos DELETEs de domínio expostos são de ganhos e despesas. Restrict protege usuário,
veículo e referências; cascata em credenciais técnicas apenas define integridade caso
ocorra manutenção autorizada futura, sem implementar exclusão de conta.
Expiração é determinada por timestamps, não depende de tarefa agendada. Limpeza eventual
de tokens expirados pode ser manutenção manual controlada, sem criar cron/filas na V1.

Não existem tabelas de dashboard, combustível, notificações, veículos históricos,
relatórios, auditoria genérica ou configurações de usuário.
