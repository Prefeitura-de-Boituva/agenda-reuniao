import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      // CLI/migrations usam a conexão direta do Neon (`DIRECT_URL`), porque DDL
      // através do PgBouncer (pooler) pode falhar. Em runtime, `src/prisma/db.ts`
      // usa `DATABASE_URL`, que é a string com `-pooler`.
      connection: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL']!,
    },
  }),
});
