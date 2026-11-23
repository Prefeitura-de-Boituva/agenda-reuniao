import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Linha = Record<string, unknown> & { id: string };

const estado = vi.hoisted(() => ({
  linhas: [] as Array<Record<string, unknown> & { id: string }>,
  papel: "NORMAL" as "NORMAL" | "PREFEITO",
}));

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Agendamento: {
          where(filtro: Record<string, unknown>) {
            const achadas = estado.linhas.filter((linha) =>
              Object.entries(filtro).every(([campo, valor]) => linha[campo] === valor)
            );
            return { orderBy: () => ({ all: async () => achadas }) };
          },
          async create(linha: Linha) {
            estado.linhas.push(linha);
            return linha;
          },
        },
      },
    },
  },
}));

vi.mock("@/lib/sessao", () => ({
  papelDaRequisicao: async () => estado.papel,
}));

import { POST } from "../route";
import {
  MSG_PRIORIDADE_ZERO_SEM_PAPEL,
  mensagemSalaSemPrioridadeZero,
} from "@/lib/prioridadeZero";
import { MSG_CONFLITO_HORARIO } from "@/prisma/errors";

/** Data suficientemente à frente para não esbarrar na RN12/RN16. */
function dataFutura(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

const DATA = dataFutura(30);

function corpo(overrides: Record<string, unknown> = {}) {
  return {
    nome: "Reunião do Gabinete",
    departamento: "Chefia de Gabinete",
    sala: "Sala Azul",
    data: DATA,
    horaInicio: "10:00",
    horaFim: "11:00",
    ...overrides,
  };
}

function postar(payload: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/agendamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

/** Reserva NORMAL já gravada no horário que a Prioridade 0 vai sobrepor. */
function semearReservaOcupada() {
  estado.linhas.push({
    id: "reserva-existente",
    nome: "Reunião da Fazenda",
    departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
    sala: "Sala Azul",
    data: DATA,
    horaInicio: "10:00",
    horaFim: "10:30",
    prioridade: "NORMAL",
  });
}

beforeEach(() => {
  estado.linhas = [];
  estado.papel = "NORMAL";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/agendamentos — Prioridade 0 (issue #66)", () => {
  it("recusa Prioridade 0 de quem não tem o papel PREFEITO", async () => {
    semearReservaOcupada();

    const response = await postar(corpo({ prioridade: "PREFEITO" }));

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe(MSG_PRIORIDADE_ZERO_SEM_PAPEL);
    expect(estado.linhas).toHaveLength(1);
  });

  it("recusa Prioridade 0 em sala que não a permite", async () => {
    estado.papel = "PREFEITO";

    const response = await postar(corpo({ sala: "Sala Verde", prioridade: "PREFEITO" }));

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe(mensagemSalaSemPrioridadeZero("Sala Verde"));
    expect(estado.linhas).toHaveLength(0);
  });

  it("rejeita valor de prioridade fora do enum", async () => {
    estado.papel = "PREFEITO";

    const response = await postar(corpo({ prioridade: "URGENTE" }));

    expect(response.status).toBe(400);
  });

  it("sobrepõe a reserva existente sem apagá-la e devolve os afetados", async () => {
    estado.papel = "PREFEITO";
    semearReservaOcupada();
    const auditoria = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await postar(corpo({ prioridade: "PREFEITO" }));

    expect(response.status).toBe(201);
    const criada = (await response.json()) as {
      prioridade: string;
      reservasConflitadas: Array<{ id: string }>;
    };
    expect(criada.prioridade).toBe("PREFEITO");
    expect(criada.reservasConflitadas.map((r) => r.id)).toEqual(["reserva-existente"]);

    // RB3: a reserva sobreposta continua gravada.
    expect(estado.linhas).toHaveLength(2);
    expect(estado.linhas[0].id).toBe("reserva-existente");
    expect(estado.linhas[1].prioridade).toBe("PREFEITO");

    // RB5: a criação foi auditada, com o agendamento afetado.
    const linha = auditoria.mock.calls[0]?.[0] as string;
    const registro = JSON.parse(linha) as {
      evento: string;
      usuario: { papel: string };
      sala: string;
      horaInicio: string;
      horaFim: string;
      afetados: Array<{ id: string; departamento: string }>;
      notificacoes: Array<{ departamento: string; mensagem: string }>;
    };
    expect(registro.evento).toBe("prioridade-zero");
    expect(registro.usuario).toEqual({ papel: "PREFEITO" });
    expect(registro.sala).toBe("Sala Azul");
    expect(registro.horaInicio).toBe("10:00");
    expect(registro.horaFim).toBe("11:00");
    expect(registro.afetados).toEqual([
      {
        id: "reserva-existente",
        nome: "Reunião da Fazenda",
        departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
        horaInicio: "10:00",
        horaFim: "10:30",
      },
    ]);
    // RB4: o departamento afetado recebe a notificação com data, sala e horário.
    expect(registro.notificacoes).toHaveLength(1);
    expect(registro.notificacoes[0].mensagem).toContain(DATA);
    expect(registro.notificacoes[0].mensagem).toContain("Sala Azul");
    expect(registro.notificacoes[0].mensagem).toContain("10:00");
  });

  it("audita a Prioridade 0 mesmo quando não há reserva afetada", async () => {
    estado.papel = "PREFEITO";
    const auditoria = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await postar(corpo({ prioridade: "PREFEITO" }));

    expect(response.status).toBe(201);
    expect((await response.json()).reservasConflitadas).toEqual([]);
    expect(auditoria).toHaveBeenCalledTimes(1);
  });

  it("sem Prioridade 0 o horário ocupado continua bloqueado", async () => {
    semearReservaOcupada();

    const response = await postar(corpo());

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe(MSG_CONFLITO_HORARIO);
    expect(estado.linhas).toHaveLength(1);
  });

  it("prioridade ausente grava NORMAL", async () => {
    const response = await postar(corpo());

    expect(response.status).toBe(201);
    expect((await response.json()).prioridade).toBe("NORMAL");
  });
});
