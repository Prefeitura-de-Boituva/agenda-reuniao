import { describe, expect, it, vi, beforeEach } from "vitest";
import { db } from "@/prisma/db";

// Mock Prisma client using the same alias used by the app
vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Agendamento: {
          where: vi.fn()
        }
      }
    }
  }
}));

import { temConflito } from "@/lib/conflict";

type Agendamento = {
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
};

const mockWhere = (returnValue: Agendamento[]) => {
  // The mock respects the filter { sala, data }
  // @ts-ignore – mock implementation for chainable methods
  db.orm.public.Agendamento.where.mockImplementation((filter: { sala: string; data: string }) => {
    const filtered = returnValue.filter(
      (a) => a.sala === filter.sala && a.data === filter.data
    );
    return {
      orderBy: vi.fn().mockResolvedValue(filtered),
    };
  });
};

describe("temConflito", () => {
  beforeEach(() => {
    // reset mock for each test
    // @ts-ignore
    db.orm.public.Agendamento.where.mockReset();
  });

  it("detecta conflito total", async () => {
    mockWhere([
      { sala: "Sala AZul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala AZul", "2026-09-20", "10:00", "11:00");
    expect(result).toBe(true);
  });

  it("detecta conflito parcial", async () => {
    mockWhere([
      { sala: "Sala AZul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala AZul", "2026-09-20", "10:30", "11:30");
    expect(result).toBe(true);
  });

  it("não gera conflito quando salas diferem", async () => {
    mockWhere([
      { sala: "Sala Verde", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala AZul", "2026-09-20", "10:30", "11:30");
    expect(result).toBe(false);
  });

  it("não gera conflito quando datas diferem", async () => {
    mockWhere([
      { sala: "Sala AZul", data: "2026-09-21", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala AZul", "2026-09-20", "10:30", "11:30");
    expect(result).toBe(false);
  });

  it("não gera conflito para reservas consecutivas", async () => {
    mockWhere([
      { sala: "Sala AZul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala AZul", "2026-09-20", "11:00", "12:00");
    expect(result).toBe(false);
  });

  it("início igual (sobreposição total no início)", async () => {
    mockWhere([
      { sala: "Sala AZul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala AZul", "2026-09-20", "10:00", "10:30");
    expect(result).toBe(true);
  });

  it("fim igual (sobreposição total no fim)", async () => {
    mockWhere([
      { sala: "Sala AZul", data: "2026-09-20", horaInicio: "10:00", horaFim: "11:00" }
    ]);
    const result = await temConflito("Sala AZul", "2026-09-20", "10:30", "11:00");
    expect(result).toBe(true);
  });
});
