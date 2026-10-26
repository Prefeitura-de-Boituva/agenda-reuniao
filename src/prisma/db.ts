import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

/**
 * Cria o cliente do Prisma 8 para o Postgres/Neon.
 *
 * A conexão é lazy: o pool `pg` só é aberto na primeira consulta que precisar
 * de runtime. Por isso este módulo pode ser importado por rotas e componentes
 * sem que o `.env` já esteja carregado (no Next.js ele é carregado antes).
 */
function criarDb() {
  return postgres<Contract>({
    contractJson,
    url: process.env['DATABASE_URL']!,
  });
}

type Db = ReturnType<typeof criarDb>;

/**
 * Em desenvolvimento o hot-reload do `next dev` reavalia os módulos e criaria
 * um pool novo a cada mudança. Guardar a instância no `globalThis` garante um
 * único pool por processo; em produção o módulo também é avaliado uma vez só.
 */
const globalForDb = globalThis as unknown as { prisma?: Db };

export const db: Db = globalForDb.prisma ?? criarDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.prisma = db;
}
