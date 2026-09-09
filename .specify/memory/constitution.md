<!--
Sync Impact Report
- Version change: template não ratificado → 1.0.0 (adoção inicial).
- Modified principles: os cinco princípios genéricos do template foram substituídos
  pelos princípios I–XVIII e XX fornecidos pelo usuário; XIX define a governança.
- Added sections: Propósito; princípios I–XX, incluindo escopo do MVP, segurança,
  testes, responsividade, documentação, deploy, Definition of Done e mudança de escopo.
- Removed sections: seções e exemplos genéricos sem conteúdo ratificado.
- Templates: ✅ .specify/templates/plan-template.md
  ✅ .specify/templates/spec-template.md
  ✅ .specify/templates/tasks-template.md
- Runtime guidance: ✅ AGENTS.md; ✅ readme.md.
- Commands: .specify/templates/commands/ não existe nesta instalação.
- Existing feature artifacts: nenhum spec.md, plan.md ou tasks.md existente.
- Follow-up TODOs: nenhum. Ratificação inicial realizada em 2026-09-08.
-->
# Constituição do DriverFin

## Propósito

O DriverFin é um projeto de portfólio inspirado em uma demanda real do mercado
freelancer. Seu propósito é entregar uma aplicação web responsiva que permita a
motoristas de aplicativo entenderem seu desempenho financeiro real pelo controle de
ganhos, despesas, lucro, horas trabalhadas e quilômetros rodados.

O objetivo principal não é se transformar em um produto infinito, mas:

> Construir, concluir, testar, publicar, documentar e disponibilizar uma V1 funcional.

Toda decisão de produto e tecnologia DEVE contribuir para esse objetivo.

## Princípios Fundamentais

### I. V1 em Primeiro Lugar

A V1 DEVE ser concluída e publicada antes do início de qualquer outro projeto de
portfólio. O fluxo obrigatório é:

**Escopo → MVP → Desenvolvimento → Testes → Deploy → README → Portfólio → CONCLUÍDO**

O trabalho DEVE ser priorizado nesta ordem:

1. Concluir
2. Fazer funcionar
3. Testar
4. Publicar
5. Melhorar

Melhorias NÃO DEVEM atrasar a publicação, salvo quando necessárias ao funcionamento
correto da V1. Uma funcionalidade só é concluída quando atende à Definition of Done
aplicável e está integrada ao produto funcional; existir localmente não basta.

### II. Escopo é uma Restrição

O escopo do MVP é fechado, salvo quando um requisito ausente impedir a V1 de cumprir
seu propósito principal. Antes de adicionar qualquer funcionalidade, DEVE ser respondido:

> Isso é necessário para colocar a V1 no ar?

Se não, ela NÃO DEVE ser implementada na V1 e DEVE ser adicionada ao Backlog V2.
Estão explicitamente fora do escopo da V1:

- Múltiplos veículos por usuário
- Integração automática com Uber ou 99
- Open Finance
- Importação de extratos bancários
- OCR
- Cálculo avançado de consumo de combustível
- Manutenção preventiva
- IPVA e licenciamento
- Metas financeiras
- Notificações
- PWA
- Aplicativo nativo
- Dark mode
- Login social
- Exportação para Excel ou PDF
- Análise financeira com IA
- Planos pagos

Nenhuma funcionalidade da V2 pode se tornar dependência da publicação da V1.

### III. A Experiência do Usuário Deve Ser Simples

O produto DEVE seguir uma abordagem **mobile first**, pois é projetado principalmente
para motoristas utilizando smartphones. As principais interações DEVEM ser rápidas,
com o menor número de etapas possível. O cadastro de despesa deve se aproximar de:

**Valor → Categoria → Data → Salvar**

Formulários DEVEM permanecer curtos e focados. Campos desnecessários, assistentes em
múltiplas etapas, cadeias de modais, configurações excessivas e fluxos complexos DEVEM
ser evitados. A aplicação DEVE funcionar bem no desktop, especialmente no dashboard,
e transmitir a sensação de um SaaS moderno, não apenas de um CRUD genérico.
Refinamentos visuais NÃO DEVEM bloquear a conclusão funcional.

### IV. A Arquitetura Deve Permanecer Simples

A arquitetura DEVE ser cliente-servidor: **Next.js → REST API → Node.js → PostgreSQL**.
A direção tecnológica aprovada é:

- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui e Recharts.
- Backend: Node.js com NestJS ou Fastify.
- Banco de dados: PostgreSQL e Prisma.
- Autenticação: JWT e refresh token.
- Infraestrutura: Docker.
- Deploy do frontend: Vercel.
- Deploy do backend e banco: Railway, Render, Neon ou serviço gerenciado equivalente
  e simples, conforme a capacidade do serviço escolhido.

Mudanças de tecnologia DEVEM ter justificativa concreta relacionada à entrega da V1.
Novos componentes de infraestrutura NÃO DEVEM ser introduzidos sem necessidade
demonstrada. São proibidos na V1, salvo necessidade técnica inevitável:

- Microserviços
- Kafka
- RabbitMQ
- Redis
- Kubernetes
- CQRS
- Event Sourcing

A complexidade DEVE ser introduzida apenas diante de um problema real que a justifique.

### V. O Modelo de Dados Deve Permanecer Enxuto

O modelo inicial DEVE conter apenas tabelas necessárias ao MVP. As principais esperadas
são `users`, `vehicles`, `earnings`, `expenses`, `expense_categories` e `platforms`.
Novas tabelas DEVEM possuir necessidade concreta de domínio e NÃO DEVEM ser criadas
apenas para extensibilidade futura.

A V1 suporta apenas um veículo por usuário, conforme o princípio VII. Relacionamentos
e restrições DEVEM ser claros para manter as regras de negócio compreensíveis.
Migrações DEVEM ser versionadas. Alterações de schema DEVEM utilizar migrations do
Prisma, evitando alterações manuais não documentadas em produção.

### VI. As Regras Financeiras Devem Ser Corretas

Os indicadores financeiros são o núcleo do produto e DEVEM ser determinísticos:

```text
Lucro = Receita - Despesas
Receita por Hora = Receita / Horas Trabalhadas
Lucro por Hora = Lucro / Horas Trabalhadas
Receita por Km = Receita / Quilômetros Rodados
Lucro por Km = Lucro / Quilômetros Rodados
```

Divisão por zero DEVE ser tratada de forma segura. O sistema NÃO DEVE apresentar `NaN`,
`Infinity`, valores monetários inválidos ou estados equivalentes.
Os cálculos DEVEM ter uma fonte de verdade claramente definida. A duplicação de regras
entre camadas DEVE ser evitada quando houver risco de resultados inconsistentes.

Valores monetários DEVEM utilizar representação adequada e precisa. A aplicação NÃO
DEVE depender de aritmética de ponto flutuante para valores monetários persistidos
quando houver risco de erros de arredondamento.

### VII. As Funcionalidades do MVP Definem a Conclusão do Produto

A V1 DEVE conter todas as capacidades abaixo.

**Autenticação**: cadastro, login, logout e recuperação de senha.

**Veículo**: marca, modelo, ano, combustível e placa opcional. A V1 suporta apenas um
veículo por usuário.

**Ganhos**:

- Campos: data, plataforma, valor, quantidade de corridas, horas trabalhadas e
  quilômetros rodados.
- Operações: criar, visualizar, editar e excluir.
- Plataformas iniciais: Uber, 99, inDrive, Particular e Outro.

**Despesas**:

- Campos: data, categoria, valor e descrição opcional.
- Operações: criar, visualizar, editar e excluir.
- Categorias iniciais: Combustível, Manutenção, Seguro, Lavagem, Pedágio,
  Estacionamento, Alimentação, Financiamento e Outros.

**Dashboard**:

- Receita total
- Despesas totais
- Lucro líquido
- Margem de lucro
- Receita por hora
- Lucro por hora
- Receita por km
- Lucro por km
- Receita por aplicativo
- Gastos por categoria
- Evolução financeira
- Últimos lançamentos

Os filtros Hoje, Semana e Mês são obrigatórios. Período personalizado PODE ser
implementado apenas se não aumentar significativamente o escopo nem atrasar a publicação.

### VIII. A Segurança Deve Ser Adequada à V1

A autenticação DEVE utilizar hash seguro de senha, access token JWT e refresh token.
Senhas em texto puro NUNCA DEVEM ser armazenadas. Rotas protegidas DEVEM validar a
autenticação no backend.

Cada usuário DEVE acessar apenas seu próprio veículo, ganhos, despesas e dados de
perfil. A autorização DEVE ser aplicada no servidor; restrições apenas no frontend
não são medidas de segurança suficientes.

Segredos NÃO DEVEM ser versionados. Configurações de ambiente DEVEM utilizar variáveis
de ambiente. Detalhes sensíveis de erros NÃO DEVEM ser expostos ao usuário final.
As medidas DEVEM ser proporcionais ao escopo; infraestrutura enterprise NÃO DEVE ser
adicionada sem necessidade para a V1.

### IX. Qualidade de Código Deve Favorecer a Entrega

O código DEVE priorizar clareza e ser compreensível sem complexidade desnecessária.
Abstrações genéricas prematuras DEVEM ser evitadas. DEVEM ser preferidos nomes claros
de domínio, funções pequenas, responsabilidades bem definidas, módulos simples e
fluxos de dados previsíveis.

DEVEM ser evitados padrões sem necessidade concreta, camadas genéricas sem consumidores
atuais, helpers para funcionalidades hipotéticas, otimização prematura e wrappers de
framework sem benefício claro.

Duplicação PODE ser temporariamente aceita quando removê-la introduzir complexidade
desproporcional. A duplicação de regras críticas de negócio DEVE ser evitada.
O código DEVE permanecer fácil de depurar.

### X. O Trabalho Deve Ser Incremental

O desenvolvimento DEVE avançar por tarefas pequenas e sequenciais. Funcionalidades
grandes DEVEM ser divididas em unidades verificáveis de forma independente.
Apenas uma quantidade limitada de áreas DEVE estar em desenvolvimento simultaneamente.
A progressão normal de uma funcionalidade DEVE ser:

**Requisito → Modelo de dados / Contrato da API → Backend → Frontend → Validação →
Testes → Integração → Concluído**

O desenvolvimento simultâneo de múltiplas áreas inacabadas DEVE ser evitado. A próxima
tarefa DEVE, em geral, ser a menor capaz de aproximar a funcionalidade atual da conclusão.

### XI. Testes Devem Proteger os Fluxos Críticos

Os testes fornecem confiança para publicar, não métricas arbitrárias de cobertura.
As prioridades são:

- Autenticação
- Isolamento de dados entre usuários
- CRUD de ganhos
- CRUD de despesas
- Cálculos financeiros
- Agregações do dashboard
- Divisão por zero
- Validação de campos obrigatórios
- Fluxos responsivos críticos

Cálculos financeiros e regras críticas do backend DEVEM possuir testes automatizados.
Os principais fluxos DEVEM ser verificados manualmente antes da publicação.
Testes NÃO DEVEM justificar o adiamento indefinido do deploy.

### XII. Responsividade Faz Parte da Conclusão

Uma funcionalidade não está concluída se funcionar apenas no desktop. Todos os fluxos
principais DEVEM funcionar em tamanhos comuns de tela mobile, especialmente navegação,
métricas do dashboard, gráficos, cadastro de ganhos e despesas, listagens, formulários
e ações de edição.

No desktop, o layout DEVE aproveitar o espaço disponível, especialmente no dashboard.
Rolagem horizontal por problemas evitáveis de layout DEVE ser tratada como defeito.

### XIII. Estados de Erro Devem Ser Explícitos

Ações do usuário DEVEM fornecer feedback claro. A interface DEVE comunicar carregamento,
sucesso, erros de validação, falha na requisição e estados vazios. Falhas NÃO DEVEM deixar
dúvida sobre se os dados foram salvos.

Erros da API DEVEM ter estruturas previsíveis. A validação DEVE ocorrer nos limites
adequados da aplicação; a validação do backend DEVE ser autoritativa.

### XIV. Documentação Faz Parte do Produto

A documentação faz parte da Definition of Done. O repositório DEVE possuir README
completo com problema, solução, screenshots, funcionalidades, stack, arquitetura,
execução local, decisões técnicas, link público e melhorias futuras.

O README DEVE conter o aviso:

> Projeto desenvolvido para portfólio a partir de um cenário inspirado em uma demanda real de mercado. Não possui vínculo com o solicitante original.

O README DEVE representar o produto implementado. Funcionalidades planejadas NÃO DEVEM
ser apresentadas como concluídas.

### XV. Deploy é Obrigatório

O projeto não está concluído enquanto funcionar apenas localmente. A V1 DEVE possuir
frontend publicado, backend publicado, PostgreSQL hospedado, configuração válida de
produção e URL pública funcional.

Problemas de deploy são problemas do produto e DEVEM ser resolvidos antes de declarar
a V1 concluída. A infraestrutura DEVE permanecer simples e de baixo custo.

### XVI. Definition of Done

A V1 só é concluída quando todos os itens aplicáveis forem atendidos:

- [ ] Projeto disponível no GitHub
- [ ] Cadastro funcionando
- [ ] Login funcionando
- [ ] Logout funcionando
- [ ] Recuperação de senha funcionando
- [ ] Cadastro de veículo funcionando
- [ ] CRUD de ganhos funcionando
- [ ] CRUD de despesas funcionando
- [ ] Dashboard exibindo receita
- [ ] Dashboard exibindo despesas
- [ ] Dashboard exibindo lucro
- [ ] Dashboard exibindo indicadores por hora
- [ ] Dashboard exibindo indicadores por km
- [ ] Gráficos funcionando
- [ ] Layout mobile funcionando
- [ ] Layout desktop funcionando
- [ ] Frontend publicado
- [ ] Backend publicado
- [ ] Banco publicado
- [ ] README finalizado
- [ ] README contendo screenshots
- [ ] Link público funcionando

A lista não dispensa as demais capacidades obrigatórias do princípio VII nem as
validações dos princípios XI–XV. Somente após cumprir os requisitos a V1 pode ser
declarada **CONCLUÍDA**.

### XVII. Política de Mudança de Escopo

Toda proposta DEVE ser classificada:

- **Necessária para V1**: sua ausência impede um requisito existente do MVP de funcionar
  corretamente; PODE entrar no escopo atual.
- **Melhoria**: melhora UX, arquitetura, performance ou experiência de desenvolvimento,
  mas não é necessária à publicação; DEVE ser adiada até concluir os requisitos da V1.
- **Funcionalidade V2**: introduz uma nova capacidade; DEVE ir para o Backlog V2.

Na dúvida, DEVE ser escolhido o menor escopo.

### XVIII. Princípio de Tomada de Decisão

Entre soluções técnicas válidas, o projeto DEVE escolher aquela que:

1. Atende corretamente ao requisito atual
2. É mais fácil de compreender
3. Introduz menos dependências
4. Exige menos infraestrutura
5. É mais fácil de testar
6. É mais fácil de publicar
7. É mais fácil de manter
8. Aproxima mais a V1 da publicação

Escalabilidade futura NÃO DEVE pesar mais que a entrega atual sem evidências de
limitação real.

### XX. Princípio Final

O DriverFin existe para ser um projeto de portfólio concluído, funcional e publicamente
acessível. DEVE otimizar para publicar uma V1 sólida, não para desenhar uma plataforma
hipotética do futuro. Entre construir mais e terminar o que existe, escolhe:

> **terminar primeiro.**

## XIX. Governança

Esta constituição rege especificações, planos, decisões técnicas e tarefas do DriverFin.
As especificações DEVEM estar de acordo com ela. Planos DEVEM identificar explicitamente
qualquer desvio intencional. Em caso de conflito, a constituição prevalece, salvo
alteração formal. Registrar uma justificativa no plano não autoriza, por si só, um
conflito com uma regra que não preveja exceção.

Alterações DEVEM:

1. Identificar a regra alterada
2. Explicar por que a regra atual é insuficiente
3. Avaliar o impacto no escopo da V1
4. Evitar complexidade especulativa
5. Atualizar especificações e documentação relacionadas

A constituição DEVE permanecer relativamente estável; alterações frequentes são um
sinal de alerta de falta de controle do escopo.

O versionamento DEVE seguir MAJOR.MINOR.PATCH: MAJOR para remoções ou redefinições
incompatíveis de princípios ou governança; MINOR para novos princípios, seções ou
ampliações materiais; PATCH para esclarecimentos e correções sem mudança semântica.
Cada alteração DEVE atualizar a versão, a data de alteração e o relatório de impacto,
preservando a data original de ratificação.

Especificações, planos, tarefas e revisões de implementação DEVEM verificar conformidade.
O Constitution Check DEVE ser realizado antes da pesquisa e novamente após o design.
A conclusão de uma funcionalidade DEVE ter evidências da Definition of Done aplicável;
a declaração de conclusão da V1 DEVE verificar todos os requisitos obrigatórios,
testes, publicação e documentação.

**Version**: 1.0.0 | **Ratified**: 2026-09-08 | **Last Amended**: 2026-09-08
