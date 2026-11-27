# Agenda de Reuniões

Aplicação web da Prefeitura de Boituva para reservar as salas de reunião.
Substitui o controle em papel: a pessoa consulta a semana, escolhe sala e
horário, e cancela a própria reserva com a senha que definiu ao agendar.

## Regras do produto

- **Salas:** Azul, Verde e Amarela.
- **Janela:** segunda a sexta, das 08:00 às 17:00, em blocos de 30 minutos.
- **Agendar** exige nome, departamento, sala, data, horário e uma **senha de
  cancelamento** (4 a 64 caracteres). São recusados data passada, horário já
  passado no dia atual e faixa que conflite com outra reserva.
- **Cancelar** só com a senha informada na criação. A senha vira hash scrypt no
  banco e nunca volta em resposta da API. Reservas antigas, criadas antes desse
  modelo, continuam canceláveis pelo departamento.
- **Acesso:** aberto — qualquer pessoa abre a agenda direto, sem login. Não há
  trilha de quem fez cada ação.
- **Retenção:** a rota interna `/api/internal/retencao-agendamentos` reporta o
  que passou de oito meses da data da reunião. Ela roda sempre em dry-run;
  apagar exige mudança explícita no código.
- **Fuso:** as regras de data e horário usam `America/Sao_Paulo` fixo, em
  `src/lib/fuso.ts`. Não reintroduza getters locais de `new Date()` nelas.

## Stack

| Componente     | Tecnologia                     |
| -------------- | ------------------------------ |
| Frontend       | Next.js (App Router)           |
| Backend        | Next.js (rotas de API)         |
| Linguagem      | TypeScript                     |
| Estilização    | Tailwind CSS                   |
| Banco de dados | PostgreSQL (Neon) via Prisma 8 |

## Rodar localmente

Requer Node.js 24 (fixado em `.nvmrc` e `engines.node`) e uma connection string
do Neon — `DATABASE_URL` é obrigatória, sem ela a aplicação não sobe.

```bash
npm install
cp .env.example .env    # preencha DATABASE_URL (com -pooler) e DIRECT_URL (sem)
npm run dev             # http://localhost:3000
```

O `next dev` só lê o `.env` ao subir: depois de criar ou editar o arquivo,
reinicie o servidor.

## Banco de dados

O projeto é contract-first no Prisma 8: o contrato está em
`src/prisma/contract.prisma`, e os artefatos gerados (`contract.json`,
`contract.d.ts`) são versionados junto das migrations em `migrations/app/`.

```bash
npm run db:verify        # marker e schema do banco devem bater com o contrato

# para alterar o contrato:
npm run contract:emit    # regenera contract.json / contract.d.ts
npm run db:plan          # planeja a migration; revise o migration.ts gerado
npm run db:migrate       # aplica no banco da DIRECT_URL
```

DDL não passa pelo PgBouncer: as migrations usam `DIRECT_URL` (string sem
`-pooler`) e a aplicação usa `DATABASE_URL` (string pooled), lida em runtime por
`src/prisma/db.ts`. Não há seed de demonstração: as reservas vêm da aplicação ou
dos testes.

## Testes

| Comando            | O que roda                          | Precisa de                             |
| ------------------ | ----------------------------------- | -------------------------------------- |
| `npm run test:run` | testes unitários (vitest)           | nada                                   |
| `npm run test:e2e` | specs em `cypress/e2e/` contra a UI | `npm run dev` na 3000 e `DATABASE_URL` |

Os specs de e2e gravam e limpam reservas no banco configurado, por isso dependem
do `DATABASE_URL` do `.env`. Se a 3000 já estiver ocupada por outra cópia do
projeto, o `next dev` sobe em outra porta e o Cypress continua testando a 3000:
confirme antes a quem pertence o processo da porta.

## Variáveis de ambiente

| Variável          | Para quê                                      |
| ----------------- | --------------------------------------------- |
| `DATABASE_URL`    | conexão da aplicação (Neon, string pooled)    |
| `DIRECT_URL`      | conexão da CLI do Prisma, para migrations     |
| `CRON_SECRET`     | protege `/api/internal/retencao-agendamentos` |

Os `.env*` locais estão no `.gitignore`. Nunca commite credenciais.

## Produção

O app roda na Vercel (região `iad1`, perto do Neon em `us-east-1`) e usa um
projeto Neon separado do de desenvolvimento. As migrations não rodam no build:
aplique-as da sua máquina (`npm run db:migrate`) antes do deploy e confirme com
`npm run db:verify`. Para rodar a imagem local, o
`docker-compose.prod.yml` sobe a aplicação na porta 3001.

## Scripts

| Comando                 | Descrição                                          |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Inicia o servidor de desenvolvimento               |
| `npm run build`         | Gera o build de produção                           |
| `npm run start`         | Inicia o build de produção                         |
| `npm run lint`          | Executa o ESLint                                   |
| `npm test`              | Executa os testes em modo watch                    |
| `npm run test:run`      | Executa os testes uma vez                          |
| `npm run test:e2e`      | Executa o Cypress contra o `npm run dev`           |
| `npm run db:verify`     | Confere marker e schema do banco contra o contrato |
| `npm run db:plan`       | Planeja uma migration a partir do contrato         |
| `npm run db:migrate`    | Aplica as migrations planejadas                    |
| `npm run contract:emit` | Regenera `contract.json` / `contract.d.ts`         |

## Estrutura de pastas

```
├── src/
│   ├── app/            # rotas (App Router) e API
│   ├── components/     # UI da agenda e formulários
│   ├── lib/            # regras de negócio e utilitários
│   └── prisma/         # contrato, artefatos e cliente do banco
├── cypress/e2e/        # testes de UI
├── migrations/         # migrations do Prisma 8 (app + snapshots)
├── public/             # arquivos estáticos
└── prisma.config.ts    # configuração da CLI do Prisma 8
```
