import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

function criarDbReal(url: string) {
  return postgres<Contract>({
    contractJson,
    url,
  });
}

type Db = ReturnType<typeof criarDbReal>;

function obterDatabaseUrl(): string {
  const url = process.env['DATABASE_URL']?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL não está definida. Configure a conexão com o PostgreSQL/Neon antes de usar a aplicação.'
    );
  }
  return url;
}

/**
 * Em desenvolvimento o hot‑reload do `next dev` reavalia os módulos e criaria
 * um pool novo a cada mudança. Guardar a instância no `globalThis` garante um
 * único pool por processo; em produção o módulo também é avaliado uma vez só.
 */
const globalForDb = globalThis as unknown as { prisma?: Db };

export const db: Db = globalForDb.prisma ?? criarDbReal(obterDatabaseUrl());

if (process.env.NODE_ENV !== 'production') {
  globalForDb.prisma = db;
}
