# Contrato REST — DriverFin V1

Base NestJS: `/api`. Navegador usa a mesma base na origem web; rewrite mantém o caminho
`/api/:path*` ao encaminhar para a origem configurada da API. Sem versionamento complexo.
Referências: [spec](../spec.md), [modelo](../data-model.md), [plano](../plan.md).

## Convenções de transporte

- JSON UTF-8; entradas rejeitam propriedades desconhecidas, inclusive userId.
- UUIDs como strings; catálogo com códigos estáveis conforme data-model.md.
- Datas `YYYY-MM-DD`; timestamps de metadados ISO 8601 UTC. Nunca formatar `date` com
  conversão de fuso. Respostas decimais são strings de duas casas, por exemplo `"120.30"`.
- Entradas amount/hours/kilometers são strings com ponto, sem separador de milhar,
  até duas casas; frontend transforma vírgula em ponto sem `parseFloat`. Contagem e ano
  são números inteiros dentro dos limites de armazenamento. Rejeitar valor inválido antes
  de construir Decimal; não converter vazio em zero, não aceitar notação exponencial.
- Todas as respostas privadas e de autenticação: `Cache-Control: private, no-store`.
- Autenticação **A**: `Authorization: Bearer <access JWT>` válido + sessão ativa no banco.
- Autenticação **R**: cookie refresh válido, sem necessidade de access válido.
- Cookies nunca aparecem em JSON. JWT só retorna em login/refresh e fica em memória.
- POSTs de autenticação e quaisquer operações com cookie exigem `Origin` igual a
  WEB_ORIGIN configurada, `Content-Type: application/json` e cabeçalho
  `X-DriverFin-Client: web`. Métodos de escrita privados também validam Origin.
  Nenhum endpoint mutável usa GET. Clientes diretos de teste enviam os mesmos headers;
  Origin não substitui autenticação. CORS não permite origens arbitrárias com credenciais.

## Endpoints e responsabilidades

| Método | Rota | Auth | Entrada principal | Sucesso |
|--------|------|------|-------------------|---------|
| POST | /api/auth/register | Pública | name, email, password | 201 `{user:{id,name,email}}`, sem sessão automática |
| POST | /api/auth/login | Pública | email, password | 200 AuthResult + Set-Cookie refresh |
| POST | /api/auth/refresh | R | `{}`; cookie | 200 AuthResult; mesmo refresh/validade absoluta |
| POST | /api/auth/logout | R ou JWT verificável | `{}` | 204 revoga sessão atual e expira cookie; idempotente se já encerrada |
| POST | /api/auth/forgot-password | Pública | email | 202 `{message:"Se houver uma conta para este e-mail, você receberá instruções para redefinir a senha."}` |
| POST | /api/auth/reset-password | Token de recuperação | token, password | 204 troca senha, invalida links e sessões; expira cookie local |
| GET | /api/users/me | A | Nenhuma | 200 `{id,name,email}` |
| GET | /api/vehicles/me | A | Nenhuma | 200 `{vehicle:Vehicle|null}` |
| POST | /api/vehicles | A | brand, model, year, fuel, plate? | 201 Vehicle; 409 se já cadastrado |
| GET | /api/platforms | A | Nenhuma | 200 `{items:[{id,name}]}` em ordem fixa |
| GET | /api/expense-categories | A | Nenhuma | 200 `{items:[{id,name}]}` em ordem fixa |
| GET | /api/vehicles/fuels | A | Nenhuma | 200 `{items:[{id,name}]}` em ordem fixa |
| POST | /api/earnings | A | date, platformId, amount, rides, hours, kilometers | 201 Earning |
| GET | /api/earnings | A | page? inteiro >=1 | 200 `{items:Earning[],page,pageSize:20,total}` |
| GET | /api/earnings/:id | A | UUID no caminho | 200 Earning; 404 genérico se ausente/alheio |
| PUT | /api/earnings/:id | A | Todos os seis campos | 200 Earning atualizado; 404 se removido/alheio |
| DELETE | /api/earnings/:id | A | UUID no caminho | 204; 404 se removido/alheio |
| POST | /api/expenses | A | date, categoryId, amount, description? | 201 Expense |
| GET | /api/expenses | A | page? inteiro >=1 | 200 `{items:Expense[],page,pageSize:20,total}` |
| GET | /api/expenses/:id | A | UUID no caminho | 200 Expense; 404 genérico se ausente/alheio |
| PUT | /api/expenses/:id | A | date, categoryId, amount, description? | 200 Expense; descrição omitida limpa para null |
| DELETE | /api/expenses/:id | A | UUID no caminho | 204; 404 se removido/alheio |
| GET | /api/dashboard | A | period= today\|week\|month; default month | 200 DashboardResult |
| GET | /api/health | Pública | Nenhuma | 200 `{status:"ok"}` se processo/banco prontos; 503 caso contrário |

Health é verificação operacional, sem métricas sensíveis ou capacidade de produto.
Catálogos são servidos pelos módulos earnings, expenses e vehicles respectivamente;
não justificam módulos administrativos nem novas tabelas. Não existem PUT/DELETE de
veículo, PATCH de perfil ou endpoints de período personalizado.

Listagens usam data DESC, createdAt DESC, id DESC; page além do fim retorna items vazio
com total atual. O cliente permite voltar página após exclusão. Não há filtro extra de
listagem, busca, exportação ou paginação configurável pelo usuário. Para lista/total
coerentes numa resposta, usar a mesma transação de leitura.

## Formatos principais

**AuthResult**: `{accessToken:string, expiresIn:900, user:{id,name,email}}`.
JWT contém sub, sid, iss, aud, iat e exp; aceitar apenas algoritmo configurado.
Refresh cookie `driverfin_refresh`: HttpOnly; Path=/api/auth; SameSite=Lax;
Secure em produção; sem Domain; Max-Age inicial 604800 segundos. Logout/reset expiram
com os mesmos atributos. Refresh não reescreve a validade nem exige novo cookie.

**Vehicle**: `{id,brand,model,year,fuel,plate:null|string}`.
**Earning**: `{id,date,platform:{id,name},amount,rides,hours,kilometers,createdAt,updatedAt}`.
**Expense**: `{id,date,category:{id,name},amount,description:null|string,createdAt,updatedAt}`.
userId não é retornado como campo editável nem recebido em DTOs.

Exemplo de criação de ganho, também formato completo de PUT:

```json
{
  "date": "2026-09-08",
  "platformId": "UBER",
  "amount": "300.00",
  "rides": 12,
  "hours": "6.00",
  "kilometers": "100.00"
}
```

Exemplo de criação de despesa:

```json
{
  "date": "2026-09-08",
  "categoryId": "FUEL",
  "amount": "120.00"
}
```

Valores, obrigatoriedade, comprimentos e limites seguem RN-001 a RN-005 do spec e os
limites físicos explicitados no modelo. Senha mantém espaços e conteúdo original.
PUT substitui os campos permitidos; ID, dono e createdAt são imutáveis.

## DashboardResult

Resposta única produzida a partir de um snapshot de leitura PostgreSQL. Exemplo com
relógio em 2026-09-08 e period=today; formato idêntico para week/month:

```json
{
  "period": {
    "key": "today",
    "startDate": "2026-09-08",
    "endDate": "2026-09-08",
    "seriesEndDate": "2026-09-08",
    "timezone": "America/Sao_Paulo"
  },
  "totals": {
    "revenue": "300.00",
    "expenses": "120.00",
    "profit": "180.00",
    "hours": "6.00",
    "kilometers": "100.00"
  },
  "indicators": {
    "margin": {"value": "60.00", "reason": null},
    "revenuePerHour": {"value": "50.00", "reason": null},
    "profitPerHour": {"value": "30.00", "reason": null},
    "revenuePerKm": {"value": "3.00", "reason": null},
    "profitPerKm": {"value": "1.80", "reason": null}
  },
  "revenueByPlatform": [{"id": "UBER", "name": "Uber", "amount": "300.00"}],
  "expensesByCategory": [{"id": "FUEL", "name": "Combustível", "amount": "120.00"}],
  "evolution": [{"date": "2026-09-08", "revenue": "300.00", "expenses": "120.00", "profit": "180.00"}],
  "recentEntries": [
    {"id": "22222222-2222-4222-8222-222222222222", "type": "expense", "date": "2026-09-08", "label": "Combustível", "amount": "120.00", "createdAt": "2026-09-08T15:00:00.000Z"},
    {"id": "11111111-1111-4111-8111-111111111111", "type": "earning", "date": "2026-09-08", "label": "Uber", "amount": "300.00", "createdAt": "2026-09-08T14:00:00.000Z"}
  ],
  "hasEntries": true
}
```

Razão sem denominador: `{value:null,reason:"NO_REVENUE"|"NO_HOURS"|"NO_KILOMETERS"}`.
Cliente traduz conforme RN-008; não substitui null por zero. Lucro negativo mantém sinal.
Totais vazios são strings `"0.00"`, distribuições e recentEntries vazios; evolução tem
dias de startDate até seriesEndDate com zero e hasEntries=false. Catálogos zerados podem
ser omitidos das distribuições; ordem dos presentes segue os catálogos.

Horas/km totais são suporte aos indicadores já solicitados, não novos cards obrigatórios.
Últimos lançamentos combinam ambas as entidades e limitam a cinco, com desempate por
UUID globalmente gerado; se houver colisão entre tabelas, type é desempate final estável.

## Erros e estado da gravação

Formato único, sem stack, SQL, tokens, senha, hash ou chave de serviço:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revise os campos informados.",
    "fields": {"amount": ["Informe um valor positivo com até duas casas decimais."]},
    "requestId": "identificador-para-diagnostico",
    "writeOutcome": "not_applied"
  }
}
```

| HTTP | code | Condição |
|------|------|----------|
| 400 | VALIDATION_ERROR | DTO, data, UUID, enum, casas decimais ou consulta inválidos |
| 400 | INVALID_RESET_TOKEN | Link inexistente, expirado, usado ou revogado; mensagem única |
| 401 | INVALID_CREDENTIALS | Login inválido sem indicar qual credencial falhou |
| 401 | SESSION_EXPIRED | JWT expirado/ausente ou sessão inválida; nenhuma escrita executada |
| 403 | ORIGIN_NOT_ALLOWED | Proteção de origem/CSRF rejeitou a operação |
| 404 | RESOURCE_UNAVAILABLE | Registro inexistente, removido ou de outro usuário |
| 409 | EMAIL_ALREADY_REGISTERED | Unicidade de e-mail |
| 409 | VEHICLE_ALREADY_EXISTS | Unicidade de veículo por usuário |
| 500/503 | INTERNAL_ERROR / SERVICE_UNAVAILABLE | Falha operacional sem detalhes sensíveis |

`fields` só existe para erros por campo. `writeOutcome` é `not_applied` somente quando
a aplicação sabe que a ação não ocorreu (pré-validação/guard ou rollback confirmado).
Caso não possa assegurar, retorna `unknown`. Para GET omitir writeOutcome.
Erro de rede, timeout, resposta perdida, erro de proxy ou resposta inesperada em mutação
são **unknown**, mesmo que o status aparente seja 5xx. Nunca repetir automaticamente.

Após 401 explícito produzido pelo guard antes de qualquer gravação, o cliente pode
renovar uma vez e repetir aquela operação uma vez: há confirmação de `not_applied`.
Sem essa confirmação, manter resultado incerto e orientar consulta à lista. Consultas
podem ser refeitas com ação de tentar novamente. Logout com resposta incerta limpa dados
visíveis, mas não afirma revogação concluída; oferecer tentar encerrar novamente, sem
reativar sessão automaticamente. Não usar o guard JWT comum para impedir logout com
access expirado: a sessão pode ser identificada pelo cookie refresh.

## Segurança e integração externa

- Recuperação retorna 202 genérico inclusive para e-mail desconhecido ou falha Resend.
  E-mail de formato inválido retorna 400 de validação; nenhuma informação sobre cadastro.
- Link: `WEB_ORIGIN/redefinir-senha#token=<segredo>`. Página lê fragmento em memória,
  remove da URL com replaceState e usa POST apenas ao enviar senha válida.
- Redefinição bem-sucedida encerra todas as sessões da conta, inclusive a atual; navega
  ao login. Senha inválida não consome token. Link vence exatamente em expiresAt.
- Resend recebe somente remetente configurado, e-mail do destinatário, assunto e corpo
  da recuperação. Nenhum webhook, lista de contatos, e-mail de boas-vindas ou marketing.
- Logs geram requestId e registram operação/status/duração sem corpos sensíveis.
- CORS, header de cliente e restrição de origem não substituem guards ou filtros userId.
