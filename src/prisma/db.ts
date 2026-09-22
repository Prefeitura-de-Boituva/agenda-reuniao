export const db: any = {
  orm: {
    public: {
      // Simple in‑memory storage to emulate Prisma behaviour during development
      _store: [] as any[],
      Agendamento: {
        /**
         * Mimics `prisma.agendamento.where({ sala, data }).orderBy({...})`
         */
        where: (filter: { sala: string; data: string }) => {
          const matched = db.orm.public._store.filter(
            (a) => a.sala === filter.sala && a.data === filter.data
          );
          return {
            orderBy: (order: { horaInicio: 'asc' | 'desc' }) => {
              const sorted = [...matched].sort((a, b) => {
                if (order.horaInicio === 'asc') return a.horaInicio.localeCompare(b.horaInicio);
                return b.horaInicio.localeCompare(a.horaInicio);
              });
              // Return a Promise to match Prisma's async API
              return Promise.resolve(sorted);
            },
          };
        },
        /**
         * Simple create that pushes into the in‑memory array and returns the record
         */
        create: async (data: any) => {
          db.orm.public._store.push(data);
          return data;
        },
      },
    },
  },
};

