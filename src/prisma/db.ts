import postgres from '@prisma/orm-postgres/runtime';
import type { Contract, Models } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

type Agendamento = Models.public_Agendamento;

function criarDbReal(url: string) {
  return postgres<Contract>({
    contractJson,
    url,
  });
}

type Db = ReturnType<typeof criarDbReal>;

/**
 * Mock em memória usado quando DATABASE_URL não está definida, para que a UI e
 * os testes E2E rode sem banco real. Implementa só o que a aplicação usa
 * (`where`/`orderBy`/`all`/`first`/`delete` e `create`) e é convertido para o
 * tipo do cliente real no retorno: a inferência dos seletores do Prisma 8
 * continua vindo de `criarDbReal`.
 */
function criarDbMock(): Db {
  const store: Agendamento[] = [];

  const casa = (a: Agendamento, filter: Partial<Agendamento>) =>
    Object.entries(filter).every(([k, v]) => a[k as keyof Agendamento] === v);

  const agendamentos = {
    where(filter: Partial<Agendamento>) {
      const matched = store.filter((a) => casa(a, filter));
      return {
        orderBy() {
          return { all: async () => matched };
        },
        async first() {
          return matched.length > 0 ? matched[0] : null;
        },
        async all() {
          return matched;
        },
        async delete() {
          for (let i = store.length - 1; i >= 0; i--) {
            if (casa(store[i], filter)) store.splice(i, 1);
          }
        },
      };
    },
    async create(data: Agendamento) {
      store.push(data);
      return data;
    },
  };

  return {
    orm: { public: { Agendamento: agendamentos } },
    async close() {},
  } as unknown as Db;
}

/**
 * Cria o cliente do Prisma 8 para o Postgres/Neon, ou o mock em memória quando
 * não há `DATABASE_URL` no ambiente.
 */
function criarDb(): Db {
  const url = process.env['DATABASE_URL'];
  return url ? criarDbReal(url) : criarDbMock();
}

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
