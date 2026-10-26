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

### Produção (Neon)

```bash
# aplique as migrations antes do deploy, a partir do repositório
npm run db:migrate

# suba a aplicação usando a string pooled do Neon
docker compose -f docker-compose.prod.yml up -d --build
```

A imagem `standalone` não inclui a CLI do Prisma, por isso as migrations são
aplicadas fora do container. Informe `DATABASE_URL` no ambiente (ou no `.env`).

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
