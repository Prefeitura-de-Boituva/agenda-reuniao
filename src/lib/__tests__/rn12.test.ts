import { describe, it, expect, vi, beforeEach } from "vitest";

// Fixa o fuso em UTC para a comparação de "horário passado" não depender
// do fuso da máquina que executa os testes (ex.: UTC-3 no Brasil).
process.env.TZ = "UTC";

// O vitest não resolve o alias "@/" deste projeto; mockamos o módulo usado
// pela rota para que a importação funcione sem alterar a configuração.
vi.mock("@/lib/validations", () => ({
  getSlotError: () => null,
  isSlotValido: () => true,
}));

// Mock Prisma client – same alias used by the app
vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Agendamento: {
          create: vi.fn(),
          where: vi.fn()
        }
      }
    }
  }
}));

import { POST } from "../../../src/app/api/agendamentos/route";

// Helper to build a Request with JSON body
function buildRequest(body: object): Request {
  return new Request("http://localhost/api/agendamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("RN12 – bloqueio de agendamento em horário passado", () => {
  const today = "2026-09-20";
  const nowISO = `${today}T10:00:00.000Z`;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nowISO));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejecta agendamento com hora de início já passada no dia atual", async () => {
    const request = buildRequest({
      nome: "Teste",
      departamento: "Dept",
      sala: "Sala Azul",
      data: today,
      horaInicio: "09:00", // passado em relação ao horário atual (10:00)
      horaFim: "10:30",
    });

    const response = await POST(request);
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.error).toBe("Horário já passou no dia atual.");
  });
});
