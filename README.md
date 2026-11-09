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

- Node.js 24 (fixado em `.nvmrc` e em `engines.node`)
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

A imagem roda com `NODE_ENV=production`, então o portão de senha vale aqui
também: defina `ACCESS_PASSWORD` no `.env` antes de subir, senão a aplicação
fica fechada em `/entrar` (veja [Porta de entrada](#porta-de-entrada-senha-do-grupo)).
Para desenvolver sem login, use `npm run dev` na 3000.

### Local com Neon (sem Caddy)

Para rodar a aplicação em Docker usando o Neon remoto, sem proxy reverso e sem
TLS local:

```bash
# 1. crie/atualize o arquivo de ambiente
cp .env.production.example .env.production.local

# 2. preencha DATABASE_URL (pooled), DIRECT_URL (direta) e ACCESS_PASSWORD
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

`ACCESS_PASSWORD` é obrigatória neste compose: sem ela o `docker compose up`
falha com uma mensagem explícita, em vez de publicar uma agenda fechada. É a
senha que os colaboradores digitam em `/entrar`.

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

## Porta de entrada (senha do grupo)

Não há login por usuário: a aplicação inteira fica atrás de **uma senha
compartilhada**, definida na variável `ACCESS_PASSWORD`. Quem tem a senha pode
criar e cancelar reservas — os registros continuam identificados apenas pelo
nome/departamento digitados no formulário.

| Situação | Comportamento |
| --- | --- |
| `npm run dev` sem `ACCESS_PASSWORD` | aberto (o Cypress não precisa de login) |
| `npm run dev` com `ACCESS_PASSWORD` | exige a senha em `/entrar` |
| Produção **sem** `ACCESS_PASSWORD` | **fechado**: páginas redirecionam para `/entrar` e o login responde `503` |
| Produção com `ACCESS_PASSWORD` | exige a senha em `/entrar` |

O portão é o `src/proxy.ts` (o antigo *middleware*, renomeado no Next 16) e roda
no runtime Node.js. Rotas públicas: `/entrar`, `/api/acesso` e `/api/health` —
esta última porque o healthcheck do Docker e da Vercel não pode exigir senha.
Fora delas, `/api/*` responde `401` em JSON e as páginas redirecionam para
`/entrar?prox=<caminho original>`.

O cookie `agenda-acesso` é `httpOnly`, `sameSite=lax`, dura 7 dias e guarda um
HMAC-SHA256 da senha, não a senha. Trocar `ACCESS_PASSWORD` invalida todos os
cookies emitidos. Para sair, `DELETE /api/acesso` limpa o cookie.

Limites conhecidos (aceitos para a validação com usuários reais da issue #29):
uma senha só, sem trilha de quem fez cada ação; sem limite de tentativas de
login; sem 2FA. Não é um controle de acesso por pessoa.

## Deploy na Vercel

O repositório já está preparado: `vercel.json` (framework `nextjs`,
`npm ci --ignore-scripts`, região `iad1`), `.nvmrc` + `engines.node` em 24 e
`output: "standalone"` ligado **apenas** quando `DOCKER_BUILD=1` (a imagem
Docker). Na Vercel o build segue o padrão do adapter.

> O fuso do servidor não importa mais: `src/lib/fuso.ts` fixa
> `America/Sao_Paulo` em RN12/RN16 e na grade. A Vercel roda em UTC e ignora
> `TZ`; sem isso, entre 21h e 24h de Boituva a regra de "horário passado" era
> pulada. Não reintroduza `new Date()` com getters locais nas regras.

### 1. Variáveis de ambiente

No painel do projeto (*Settings → Environment Variables*), adicione em
**Production e Preview** (preview sem senha vira uma URL pública da agenda):

| Variável | Valor | Observação |
| --- | --- | --- |
| `DATABASE_URL` | string **pooled** do Neon (host `-pooler`) | mesma do `.env.production.local` |
| `ACCESS_PASSWORD` | senha do grupo | obrigatória; sem ela o acesso fica fechado |

`DIRECT_URL` **não** vai para a Vercel: ela só serve à CLI do Prisma, que roda a
partir do repositório. Nunca commite credenciais nem use `npm run seed` no banco
de produção.

### 2. Banco

As migrations não rodam no build da Vercel. Antes do primeiro deploy, a partir
da sua máquina:

```bash
npm run db:verify                      # espera: marker e schema batem com o contrato
# se houver migration pendente:
npm run db:plan && npm run db:migrate  # usam DIRECT_URL (sem -pooler)
```

Use a região `iad1` (Washington) para as functions: o Neon está em `us-east-1`.
A região padrão brasileira (`gru1`) acrescenta uma ida e volta ao banco em cada
consulta.

### 3. Publicar

```bash
npm i -g vercel
vercel login          # a conta e a vinculação ficam por sua conta
vercel link           # cria/vincula o projeto (gera .vercel/, já no .gitignore)
vercel --prod         # publica e devolve a URL
```

Ou pelo painel: *Add New → Project → Import* deste repositório, branch
`develop`, e *Deploy*. O nome `agenda-reuniao` só fica em
`agenda-reuniao.vercel.app` se estiver livre; caso contrário a Vercel sugere
`agenda-reuniao-<escopo>.vercel.app`.

Para um domínio institucional, adicione-o em *Settings → Domains* e siga os
registros DNS indicados — `*.vercel.app` não é um endereço da Prefeitura.

### 4. Conferir depois do deploy

```bash
curl -fsS https://<sua-url>/api/health
curl -fsS "https://<sua-url>/api/health?db=1"   # database: ok

curl -i https://<sua-url>/                      # 307 para /entrar
curl -i https://<sua-url>/api/agendamentos      # 401
curl -i -X POST https://<sua-url>/api/acesso \
  -H 'content-type: application/json' \
  -d '{"senha":"<ACCESS_PASSWORD>"}'            # 200 + Set-Cookie: agenda-acesso
```

Com o cookie do último comando, repita o `GET /api/agendamentos`: deve responder
`200`. Só então distribua a URL para os colaboradores (issue #29).

### 5. Limites do plano e da hospedagem

- **Hobby não é permitido para uso de produção** nos termos da Vercel. Para a
  Prefeitura usar de forma contínua, o plano precisa ser Pro (ou outra
  hospedagem). Hobby serve apenas para uma validação curta e interna.
- Cada push na branch vinculada gera um deploy novo; cada PR gera uma URL de
  preview. Todas herdam as env vars do ambiente correspondente.
- A função serverless é stateless: nada de gravar em disco. O estado vive no
  Neon e no `localStorage` do navegador.
- Sem `ACCESS_PASSWORD` o portão fecha, não abre — um deploy sem a env var não
  expõe a agenda, mas também não funciona.

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
