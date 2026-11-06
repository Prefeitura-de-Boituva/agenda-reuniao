# Agenda-Reuniao

Aplicação web para agendamento de salas de reunião, substituindo o controle
manual em papel. Permite consultar disponibilidade, criar agendamentos e
cancelar reservas informando o departamento.

## Stack

| Componente       | Tecnologia                              |
| ---------------- | --------------------------------------- |
| Frontend         | Next.js (App Router)                    |
| Backend          | Next.js                                 |
| Linguagem        | TypeScript                              |
| Estilização      | Tailwind CSS                            |
| Banco de dados   | PostgreSQL (Neon) via Prisma 8          |

## Pré-requisitos

- Node.js 20 ou superior (recomendado: 24)
- npm (vem com o Node.js)
- Uma connection string do Neon (ou um PostgreSQL local >= 15)

## Como rodar localmente

```bash
# instalar dependências
npm install

# configurar o ambiente (veja a seção "Banco de dados" abaixo)
cp .env.example .env

# iniciar servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Testes automatizados e portas

| Comando | O que roda | Precisa de |
| --- | --- | --- |
| `npm run test:run` | testes unitários (vitest), sem servidor | nenhuma porta |
| `npm run test:e2e` | specs em `cypress/e2e/` contra a UI | `npm run dev` na **3000** |

O Cypress lê `http://localhost:3000` do `cypress.config.ts`. Se essa porta já estiver
ocupada por outra cópia do projeto, o `next dev` sobe sozinho na primeira livre (3002 em
diante) e o `npm run test:e2e` passa a testar **a cópia errada, sem avisar**. Antes de
rodar, confirme que o processo da 3000 pertence ao diretório desejado:

```bash
netstat -ano | findstr :3000        # anote o PID da coluna seguinte
```

```powershell
# confirme que o PID pertence ao diretório que você quer testar
# (o wmic foi removido do Windows 11 24H2; use Get-CimInstance)
powershell -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=<PID>').CommandLine"
```

```bash
npx cypress run --config baseUrl=http://localhost:3002   # ou force a porta certa
```

A porta **3001** pertence ao container de produção local (seções "Docker" abaixo), não ao
`next dev`; os specs de e2e nunca devem apontar para ela, porque ela grava no Neon real.

`cancelamento.cy.ts` semeia e remove agendamentos pela API real, então exige
`DATABASE_URL` configurada no `.env`. Sem banco, a rota responde 500 e a suíte se marca
como *pendente* (skip) em vez de reportar falha de produto; os demais specs não dependem
de banco.


## Banco de dados (Neon)

O projeto usa **Prisma 8** (contract-first). O contrato está em
`src/prisma/contract.prisma`; os artefatos `contract.json` e `contract.d.ts` são
gerados e versionados.

### 1. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha com os dados do painel do Neon
(*Connection Details*):

```env
# Runtime da aplicação — string com `-pooler`
DATABASE_URL="postgresql://USUARIO:SENHA@ep-xxxx-pooler.regiao.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# CLI/migrations — string sem `-pooler` (DDL não passa pelo PgBouncer)
DIRECT_URL="postgresql://USUARIO:SENHA@ep-xxxx.regiao.aws.neon.tech/neondb?sslmode=require"
```

- `DATABASE_URL` é lida em runtime por `src/prisma/db.ts`.
- `DIRECT_URL` é lida pela CLI do Prisma (`prisma.config.ts`). Se ela não
  existir, a CLI usa `DATABASE_URL` como fallback.

> O `.env` está no `.gitignore`. Nunca commite credenciais.

Para desenvolver sem Neon, use a opção 1 do `.env.example` (Postgres local):

```bash
docker compose up -d postgres   # só o banco; o serviço app ocuparia a 3001
npm run db:migrate              # aplica migrations/app/ no banco local
```

O `next dev` lê o `.env` apenas ao subir: depois de criá-lo ou alterá-lo,
reinicie o servidor. Sem `DATABASE_URL`, a API responde 500
("Erro interno ao criar agendamento.") e a grade ainda mostra os slots como
livres, porque o GET falha em silêncio — o sintoma parece bug de tela, mas é
banco ausente.

### 2. Verificar a conexão e o schema

```bash
npm run db:verify
```

Esperado: `Database marker and schema match contract`. O banco do Neon já está
migrado (migrations em `migrations/app/`).

### 3. Popular dados de teste (opcional)

```bash
npm run seed
```

O seed é idempotente e cria 5 agendamentos para os próximos dias.

### 4. Alterar o contrato (fluxo futuro)

```bash
# 1. edite src/prisma/contract.prisma
npm run contract:emit      # regenera contract.json / contract.d.ts
npm run db:plan            # planeja a migration (revisar o migration.ts gerado)
npm run db:migrate         # aplica no banco apontado por DIRECT_URL/DATABASE_URL
```

### 5. Criar o ambiente de produção (issue #28)

O ambiente de produção usa um **projeto Neon separado** (`agenda-reuniao-prod`),
com banco vazio. O projeto atual continua sendo o de desenvolvimento.

```bash
# autenticar a CLI do Neon (uma vez)
npx neonctl auth

# criar o projeto na mesma região do ambiente de desenvolvimento
npx neonctl projects create --name agenda-reuniao-prod --region-id aws-us-east-2

# obter as duas connection strings
npx neonctl connection-string --project-id <id> --pooled   # DATABASE_URL
npx neonctl connection-string --project-id <id>            # DIRECT_URL
```

Guarde as URLs em `.env.production.local` (ignorado pelo Git) ou nas variáveis
de ambiente do servidor. Nunca commite credenciais.

```bash
# aplicar as migrations no banco de produção (string direta, sem -pooler)
npx prisma db migrate --db "<DIRECT_URL de produção>"
npx prisma db verify  --db "<DIRECT_URL de produção>" --strict
```

> **Atenção:** não rode `npm run seed` em produção. O seed insere agendamentos
> de demonstração e é destinado apenas ao ambiente de desenvolvimento.

O banco de produção começa **vazio** (somente schema). Para subir a aplicação
apontando para ele, use `docker-compose.prod.yml` com `DATABASE_URL` definida.

## Docker

### Desenvolvimento (Postgres local)

```bash
docker compose up -d --build
```

Sobe a aplicação em `http://localhost:3001` e um Postgres local.

### Local com Neon (sem Caddy)

Para rodar a aplicação em Docker usando o Neon remoto, sem proxy reverso e sem
TLS local:

```bash
# 1. crie/atualize o arquivo de ambiente
cp .env.production.example .env.production.local

# 2. preencha DATABASE_URL (pooled) e DIRECT_URL (direta)
#    O .env.production.local é ignorado pelo Git.

# 3. aplique/revalide as migrations pela conexão direta
npx prisma db migrate --db "<DIRECT_URL>"
npx prisma db verify  --db "<DIRECT_URL>" --strict

# 4. build e subida
docker compose -f docker-compose.prod.yml \
  --env-file .env.production.local \
  up -d --build
```

A aplicação fica disponível em `http://localhost:3001`. A porta pode ser
alterada com `APP_PORT` no `.env.production.local`:

```env
APP_PORT=3002
```

> O compose de desenvolvimento (`docker-compose.yml`) também usa a porta
> `3001`. Não rode os dois ao mesmo tempo sem trocar a porta.

`DATABASE_URL` deve ser a string **pooled** do Neon. A `DIRECT_URL` (sem
`-pooler`) é usada apenas pela CLI, fora do container. A imagem `standalone` não
inclui a CLI do Prisma, por isso as migrations são aplicadas antes do deploy.
Não rode `npm run seed` em produção.

**Segurança:** rotacione a senha do role do Neon se ela tiver sido exposta e
atualize `DATABASE_URL`/`DIRECT_URL` no `.env.production.local`. O arquivo não
deve ser versionado nem copiado para dentro da imagem.

Para checar:

```bash
curl -fsS http://localhost:3001/api/health
curl -fsS "http://localhost:3001/api/health?db=1"

docker compose -f docker-compose.prod.yml \
  --env-file .env.production.local ps

docker inspect --format '{{.State.Health.Status}}' \
  "$(docker compose -f docker-compose.prod.yml \
    --env-file .env.production.local ps -q app)"

docker compose -f docker-compose.prod.yml \
  --env-file .env.production.local logs -f --tail=100
```

> O healthcheck padrão não consulta o Neon de propósito: uma consulta a cada
> 30s impediria a suspensão automática do banco. `?db=1` é para uso manual.

Para parar:

```bash
docker compose -f docker-compose.prod.yml \
  --env-file .env.production.local down
```

**Rollback:** a imagem é tagueada com `${TAG:-latest}`. Para voltar a um commit
anterior:

```bash
git checkout <commit-anterior>
TAG=<commit-anterior> docker compose -f docker-compose.prod.yml \
  --env-file .env.production.local up -d --build
```

> Rollback da imagem não desfaz migrations. Se houve mudança de schema, faça
> backup/snapshot do Neon antes de aplicar e planeje o rollback do banco.

Sem Caddy, não há HTTPS nem domínio configurado neste ambiente. Use o acesso
local ou coloque a aplicação atrás de um proxy/WAF se for expô-la a outras
máquinas.

## Scripts disponíveis

| Comando                | Descrição                                          |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Inicia o servidor de desenvolvimento               |
| `npm run build`        | Gera o build de produção                           |
| `npm run start`        | Inicia o build de produção                         |
| `npm run lint`         | Executa o ESLint                                   |
| `npm test`             | Executa os testes em modo watch                    |
| `npm run test:run`     | Executa os testes uma vez                          |
| `npm run seed`         | Insere agendamentos de teste (idempotente)         |
| `npm run db:verify`    | Confere marker e schema do banco contra o contrato |
| `npm run db:plan`      | Planeja uma migration a partir do contrato         |
| `npm run db:migrate`   | Aplica as migrations planejadas                    |
| `npm run contract:emit`| Regenera `contract.json` / `contract.d.ts`         |

## Estrutura de pastas

```
├── src/
│   ├── app/            # Rotas da aplicação (App Router) e API
│   ├── components/     # Componentes de UI (agenda, formulários)
│   ├── lib/            # Regras de negócio e utilitários
│   └── prisma/         # Contrato, artefatos e cliente do banco
├── migrations/         # Migrations do Prisma 8 (app + snapshots)
├── public/             # Arquivos estáticos
├── prisma.config.ts    # Configuração da CLI do Prisma 8
└── package.json
```
