import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Fixa o fuso para a regra RN12 (horário passado no dia corrente) não depender
// do fuso da máquina que executa os testes.
process.env.TZ = "UTC";

type AgendamentoRecord = {
  id: string;
  nome: string;
  departamento: string;
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  criadoEm: string;
};

/**
 * `@/lib/validations` e `@/lib/conflict` NÃO são mockados: o objetivo é
 * exercitar a cadeia real da rota de edição. Só o banco vira um store in-memory
 * que reproduz o contrato do Prisma 8 usado pela aplicação
 * (`.where().first()`, `.where().orderBy().all()` e `.where().update()`).
 */
const { _store } = vi.hoisted(() => ({ _store: [] as AgendamentoRecord[] }));

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Agendamento: {
          where: vi.fn((filter: Record<string, unknown>) => {
            const matched = _store.filter((a) =>
              Object.entries(filter).every(
                ([key, value]) => (a as Record<string, unknown>)[key] === value
              )
            );
            return {
              orderBy: vi
                .fn()
                .mockReturnValue({ all: vi.fn().mockResolvedValue(matched) }),
              first: vi.fn().mockResolvedValue(matched[0] ?? null),
              update: vi.fn(async (dados: Partial<AgendamentoRecord>) => {
                const alvo = matched[0];
                if (!alvo) return null;
                Object.assign(alvo, dados);
                return alvo;
              }),
            };
          }),
        },
      },
    },
  },
}));

import { PUT } from "../../../src/app/api/agendamentos/[id]/route";
import { MSG_CONFLITO_HORARIO } from "../../prisma/errors";

const AGENDAMENTO: AgendamentoRecord = {
  id: "abc-123",
  nome: "Reunião original",
  departamento: "Chefia de Gabinete",
  sala: "Sala Azul",
  data: "2026-09-22", // futura: não cai na RN12 por padrão
  horaInicio: "10:00",
  horaFim: "11:00",
  criadoEm: "2026-09-19T10:00:00.000Z",
};

const corpoValido = {
  nome: "Reunião remarcada",
  departamento: "Secretaria Municipal Obras Públicas",
  horaInicio: "14:00",
  horaFim: "15:30",
};

const put = async (body: unknown, id = AGENDAMENTO.id) => {
  const request = new Request(`http://localhost/api/agendamentos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const response = await PUT(request, { params: Promise.resolve({ id }) });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
};

beforeEach(() => {
  _store.length = 0;
  _store.push({ ...AGENDAMENTO });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-21T07:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PUT /api/agendamentos/[id]", () => {
  describe("200 – edição gravada", () => {
    it("atualiza nome, departamento e horário, mantendo sala e data", async () => {
      const { status, json } = await put(corpoValido);

      expect(status).toBe(200);
      expect(json).toMatchObject({
        id: "abc-123",
        nome: "Reunião remarcada",
        departamento: "Secretaria Municipal Obras Públicas",
        sala: "Sala Azul",
        data: "2026-09-22",
        horaInicio: "14:00",
        horaFim: "15:30",
      });
      expect(_store[0].horaInicio).toBe("14:00");
    });

    it("ignora sala e data vindas no corpo: não se muda a reserva de sala", async () => {
      _store.push({
        ...AGENDAMENTO,
        id: "verde-1",
        sala: "Sala Verde",
        data: "2026-09-23",
        horaInicio: "14:00",
        horaFim: "15:30",
      });

      const { status, json } = await put({
        ...corpoValido,
        sala: "Sala Verde",
        data: "2026-09-23",
      });

      // Se a sala do corpo fosse aceita, a reserva cairia em cima da que já
      // existe na Sala Verde nesse horário e a rota responderia 409.
      expect(status).toBe(200);
      expect(json.sala).toBe("Sala Azul");
      expect(json.data).toBe("2026-09-22");
    });

    it("não conflita com a própria reserva ao manter o horário", async () => {
      const { status, json } = await put({
        nome: "Só o nome mudou",
        departamento: "Chefia de Gabinete",
        horaInicio: "10:00",
        horaFim: "11:00",
      });

      expect(status).toBe(200);
      expect(json.nome).toBe("Só o nome mudou");
    });
  });

  describe("409 – conflito com outra reserva", () => {
    it("responde o conflito quando o novo horário sobrepõe o de terceiros", async () => {
      _store.push({
        ...AGENDAMENTO,
        id: "outro-1",
        data: "2026-09-22",
        horaInicio: "15:00",
        horaFim: "16:00",
      });

      const { status, json } = await put(corpoValido);

      expect(status).toBe(409);
      expect(json.error).toBe(MSG_CONFLITO_HORARIO);
      expect(_store[0].horaInicio).toBe("10:00");
    });
  });

  describe("404 – agendamento inexistente", () => {
    it("não cria nada quando o id não existe", async () => {
      const { status, json } = await put(corpoValido, "id-que-nao-existe");

      expect(status).toBe(404);
      expect(json.error).toBe("Agendamento não encontrado.");
    });
  });

  describe("400 – validações", () => {
    it("rejeita corpo que não é JSON", async () => {
      const { status, json } = await put("{nome:");

      expect(status).toBe(400);
      expect(json.error).toBe("Corpo da requisição inválido.");
    });

    it("rejeita campo ausente", async () => {
      const { status, json } = await put({
        departamento: corpoValido.departamento,
        horaInicio: corpoValido.horaInicio,
        horaFim: corpoValido.horaFim,
      });

      expect(status).toBe(400);
      expect(json.error).toBe("O campo nome é obrigatório.");
    });

    it("rejeita campo em branco", async () => {
      const { status, json } = await put({ ...corpoValido, nome: "   " });

      expect(status).toBe(400);
      expect(json.error).toBe("O campo nome é obrigatório.");
    });

    it("rejeita departamento fora do enum", async () => {
      const { status, json } = await put({ ...corpoValido, departamento: "RH" });

      expect(status).toBe(400);
      expect(json.error).toBe("Departamento inválido.");
    });

    it("rejeita horário fora da grade de 30 minutos", async () => {
      const { status, json } = await put({ ...corpoValido, horaInicio: "14:15" });

      expect(status).toBe(400);
      expect(json.error).toBe(
        "O horário de início deve estar alinhado em blocos de 30 minutos."
      );
    });

    it("rejeita fim anterior ao início", async () => {
      const { status, json } = await put({
        ...corpoValido,
        horaInicio: "14:00",
        horaFim: "13:00",
      });

      expect(status).toBe(400);
      expect(json.error).toBe("O horário de fim deve ser posterior ao horário de início.");
    });

    it("RN12: rejeita remarcar para horário já passado no dia corrente", async () => {
      _store[0].data = "2026-09-21"; // hoje, no relógio falso das 14h
      vi.setSystemTime(new Date("2026-09-21T14:00:00.000Z"));

      const { status, json } = await put({
        ...corpoValido,
        horaInicio: "10:00",
        horaFim: "11:00",
      });

      expect(status).toBe(400);
      expect(json.error).toBe("Horário já passou no dia atual.");
    });
  });
});
