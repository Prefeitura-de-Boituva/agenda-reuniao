import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Prisma client – the same alias used by the app
vi.mock("../../prisma/db", () => ({
  db: {
    orm: {
      public: {
        Agendamento: {
          where: vi.fn(),
        },
      },
    },
  },
}));

import { db } from "../../prisma/db";
import { temConflito } from "../conflict";

type Agendamento = {
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
};

// `where` é substituído pelo `vi.mock` acima, mas o TypeScript continua vendo
// a assinatura real do cliente. Este cast dá acesso à API de mock com tipos.
const agendamentoMock = db.orm.public.Agendamento as unknown as {
  where: ReturnType<typeof vi.fn>;
};

// Helper to set up the mocked .where -> .orderBy -> .all chain
const mockWhere = (returnValue: Agendamento[]) => {
  // The mock respects the filter { sala, data }
  agendamentoMock.where.mockImplementation((filter: { sala: string; data: string }) => {
    const filtered = returnValue.filter(
      (a) => a.sala === filter.sala && a.data === filter.data
    );
    return {
      // Prisma 8: `.orderBy(...)` devolve a coleção; `.all()` a resolve.
      orderBy: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue(filtered) }),
    };
  });
};

describe("temConflito", () => {
  beforeEach(() => {
    // reset mock for each test
    agendamentoMock.where.mockReset();
  });

  it("detecta conflito total", async () => {
    mockWhere([
      { sala: "Sala Azul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Azul", "2026-09-20", "10:00", "11:00");
    expect(result).toBe(true);
  });

  it("detecta conflito parcial", async () => {
    mockWhere([
      { sala: "Sala Azul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Azul", "2026-09-20", "10:30", "11:30");
    expect(result).toBe(true);
  });

  it("não gera conflito quando salas diferem", async () => {
    mockWhere([
      { sala: "Sala Verde", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Azul", "2026-09-20", "10:30", "11:30");
    expect(result).toBe(false);
  });

  it("não gera conflito quando datas diferem", async () => {
    mockWhere([
      { sala: "Sala Azul", data: "2026-09-21", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Azul", "2026-09-20", "10:30", "11:30");
    expect(result).toBe(false);
  });

  it("detecta conflito quando fim coincide", async () => {
    mockWhere([
      { sala: "Sala Azul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Azul", "2026-09-20", "09:30", "11:00");
    expect(result).toBe(true);
  });

  it("não gera conflito em sala diferente", async () => {
    mockWhere([
      { sala: "Sala Azul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Verde", "2026-09-20", "10:30", "11:30");
    expect(result).toBe(false);
  });

  it("não gera conflito para reservas consecutivas", async () => {
    mockWhere([
      { sala: "Sala Azul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Azul", "2026-09-20", "11:00", "12:00");
    expect(result).toBe(false);
  });

  it("início igual (sobreposição no início)", async () => {
    mockWhere([
      { sala: "Sala Azul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Azul", "2026-09-20", "10:00", "10:30");
    expect(result).toBe(true);
  });

  it("fim igual (sobreposição no fim)", async () => {
    mockWhere([
      { sala: "Sala Azul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala Azul", "2026-09-20", "10:30", "11:00");
    expect(result).toBe(true);
  });
});
