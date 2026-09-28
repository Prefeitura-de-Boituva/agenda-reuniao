export const db: any = {
  orm: {
    public: {
      // Simple in‑memory storage to emulate Prisma behaviour during development
      _store: [] as any[],
      Agendamento: {
        /**
         * Mimics `prisma.agendamento.where({ ... })` followed by
         * `.orderBy(...)`, `.first()` or `.delete()`.
         * The filter matches any field(s) by strict equality (ex.: { id }, { sala, data }).
         */
        where: (filter: Record<string, unknown>) => {
          const matched = db.orm.public._store.filter((a: any) =>
            Object.entries(filter).every(([key, value]) => a[key] === value)
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
            first: () => Promise.resolve(matched[0] ?? null),
            delete: async () => {
              const deleted = matched[0] ?? null;
              if (deleted) {
                const index = db.orm.public._store.findIndex(
                  (a: { id: string }) => a.id === deleted.id
                );
                if (index !== -1) db.orm.public._store.splice(index, 1);
              }
              return deleted;
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