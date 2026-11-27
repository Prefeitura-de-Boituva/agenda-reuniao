# Agenda de Reuniões

Aplicação para consultar a disponibilidade das salas, criar e editar reuniões e
cancelar agendamentos. O acesso é público; a criação e o cancelamento não exigem
login, e o cancelamento confirma o departamento cadastrado no agendamento.

## Stack

| Componente | Tecnologia |
| --- | --- |
| Aplicação | Next.js 16 (App Router), React e TypeScript |
| Estilização | Tailwind CSS 4 |
| Banco | PostgreSQL/Neon com Prisma 8 |
| Testes | Vitest e Cypress |

## Executar localmente

Pré-requisitos: Node.js 24, npm e PostgreSQL 15+ ou uma connection string do Neon.

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Acesse `http://localhost:3000`.

Se ainda não houver um banco configurado, a aplicação sobe com um mock em
memória. Nesse modo os dados são temporários e podem desaparecer a cada
reinício do processo; ele serve apenas para desenvolvimento e testes.

## Banco de dados

O contrato fica em `src/prisma/contract.prisma`; `contract.json` e
`contract.d.ts` são artefatos gerados e versionados.

No `.env`:

```env
# Runtime: connection string pooled do Neon
DATABASE_URL="postgresql://USUARIO:SENHA@ep-xxxx-pooler.regiao.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# CLI/migrations: connection string direta, sem -pooler
DIRECT_URL="postgresql://USUARIO:SENHA@ep-xxxx.regiao.aws.neon.tech/neondb?sslmode=require"
```

Para PostgreSQL local, use a `DATABASE_URL` e as credenciais já indicadas no
`.env.example`. `DIRECT_URL` é opcional nesse caso; a CLI usa `DATABASE_URL`
como fallback. Nunca versione arquivos `.env*` com credenciais reais.

Comandos principais:

```bash
npm run db:verify     # confere o schema real contra o contrato
npm run seed          # dados de demonstração; somente em desenvolvimento
npm run contract:emit # regenera os artefatos após alterar o contrato
npm run db:plan       # planeja uma nova migration
npm run db:migrate    # aplica as migrations pendentes
```

Depois de alterar o `.env`, reinicie o `next dev`. Sem `DATABASE_URL`, a API usa
o mock em memória; com uma URL inválida ou banco indisponível, as consultas
falham.

## Testes

| Comando | Descrição |
| --- | --- |
| `npm run test:run` | Testes unitários com Vitest |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção |
| `npm run test:e2e` | Cypress contra `http://localhost:3000` |

Confirme que a porta 3000 pertence a este projeto antes do Cypress. Para usar
outra porta:

```bash
npm run dev -- --port 3002
npx cypress run --config baseUrl=http://localhost:3002
```

O fluxo de cancelamento semeia e remove agendamentos pela API. Para não alterar
o banco de desenvolvimento ou produção, execute essa suíte em um servidor
temporário com `DATABASE_URL` vazia, usando o mock em memória.

## Docker

### PostgreSQL local

```bash
docker compose up -d postgres
npm run db:migrate
docker compose up -d --build app
```

Aplicação: `http://localhost:3001`. O volume `postgres-data` preserva o banco
local entre execuções.

### Neon

Preencha `.env.production.local` a partir de `.env.production.example`, aplique
as migrations pela conexão direta e suba o serviço:

```bash
npx prisma db migrate --db "<DIRECT_URL>"
npx prisma db verify --db "<DIRECT_URL>" --strict
docker compose -f docker-compose.prod.yml \
  --env-file .env.production.local up -d --build
```

A porta padrão também é 3001 e pode ser alterada com `APP_PORT`. Não execute os
dois modos simultaneamente na mesma porta. As migrations não rodam dentro da
imagem; aplique-as antes de publicar.

Healthchecks:

```bash
curl -fsS http://localhost:3001/api/health
curl -fsS "http://localhost:3001/api/health?db=1"
```

O healthcheck padrão não consulta o banco para não manter o Neon acordado. Com
`DATABASE_URL` definida, `?db=1` verifica a conexão; sem ela, o resultado `ok`
refere-se ao mock em memória.

## Deploy na Vercel

Configure `DATABASE_URL` pooled nos ambientes de Production e Preview. A
aplicação é pública e não possui mais senha de entrada. `DIRECT_URL` é usada
somente pela CLI local e não deve ser enviada para a Vercel.

As migrations não rodam no build. Antes do primeiro deploy:

```bash
npm run db:verify
# se houver migration pendente:
npm run db:plan && npm run db:migrate
```

```bash
vercel login
vercel link
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel --prod
```

Não execute `npm run seed` em produção. Depois do deploy, confira
`/api/health?db=1` e faça um agendamento de teste antes de divulgar a URL.

## Estrutura

```text
src/
  app/          Rotas e endpoints da API
  components/   Componentes de interface
  lib/          Regras de negócio e utilitários
  prisma/       Contrato, artefatos e cliente do banco
migrations/     Migrations do Prisma 8
cypress/        Testes end-to-end
public/         Arquivos estáticos
```
