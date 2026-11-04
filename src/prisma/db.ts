import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

/**
 * Cria o cliente do Prisma 8 para o Postgres/Neon.
 *
 * Quando DATABASE_URL não está definida (ambiente de desenvolvimento sem banco
 * real) usamos um mock em memória que implementa apenas os métodos usados
 * pela aplicação (`where`, `orderBy`, `all`, `create`). Isso permite que a UI
 * funcione para teste sem precisar de um banco real.
 */
function criarDb() {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    // ---------- Mock in‑memory ----------
    const store: any[] = [];
    const mockOrm = {
      public: {
        Agendamento: {
          where(filter: Record<string, unknown>) {
            const matched = store.filter(function (a) {
              for (const [k, v] of Object.entries(filter)) {
                if ((a as Record<string, unknown>)[k] !== v) return false;
              }
              return true;
            });
            return {
              // orderBy ignora o seletor porque a coleção já está filtrada
              orderBy() {
                return {
                  all: async () => matched,
                };
              },
              // first retorna o primeiro elemento ou null
              async first() {
                return matched.length > 0 ? matched[0] : null;
              },
              // usado apenas pelo seed para limpeza preliminar
              async delete() {
                const idx = store.findIndex(
                  (a) => a.sala === filter.sala && a.data === filter.data && a.horaInicio === filter.horaInicio
                );
                if (idx >= 0) store.splice(idx, 1);
              },
            } as any;
          },
          async create(data: any) {
            store.push(data);
            return data;
          },
        },
      },
    };
    return { orm: mockOrm } as any;
    // ---------- End of mock ----------
  }

  // ---------- Real connection ----------
  return postgres<Contract>({
    contractJson,
    url,
  });
}

type Db = ReturnType<typeof criarDb>;

/**
 * Em desenvolvimento o hot‑reload do `next dev` reavalia os módulos e criaria
 * um pool novo a cada mudança. Guardar a instância no `globalThis` garante um
 * único pool por processo; em produção o módulo também é avaliado uma vez só.
 */
const globalForDb = globalThis as unknown as { prisma?: Db };

export const db: Db = globalForDb.prisma ?? criarDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.prisma = db;
}
