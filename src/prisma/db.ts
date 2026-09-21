export const db: any = {
  orm: {
    public: {
      Agendamento: {
        // placeholder; real implementation provided by Prisma at runtime
        where: () => {
          throw new Error("Prisma client not initialized");
        }
      }
    }
  }
};

