import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Fixa o fuso para a comparação de "horário passado" (RN12) não depender do
// fuso da máquina que executa os testes (ex.: UTC-3 no Brasil).
process.env.TZ = "UTC";

/** Registro como a rota o grava no store. */
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
 * Diferente de `rn12.test.ts`, aqui `@/lib/validations` NÃO é mockado: o
 * objetivo é exercitar a cadeia real de validações da rota.
 *
 * O store in-memory é substituído por um dublê que respeita o filtro
 * `{ sala, data }` e a cadeia `.where().orderBy()`, reproduzindo o contrato de
 * `src/lib/conflict.ts`.
 */
const { _store } = vi.hoisted(() => ({ _store: [] as AgendamentoRecord[] }));

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        _store,
        Agendamento: {
          where: vi.fn((filter: Record<string, unknown>) => {
            const matched = _store.filter((a) =>
              Object.entries(filter).every(
                ([key, value]) => (a as Record<string, unknown>)[key] === value
              )
            );
            return {
              orderBy: vi.fn().mockResolvedValue(matched),
              first: vi.fn().mockResolvedValue(matched[0] ?? null),
            };
          }),
          create: vi.fn(async (data: AgendamentoRecord) => {
            _store.push(data);
            return data;
          }),
        },
      },
    },
  },
}));

import { db } from "../../prisma/db";
import { POST } from "../../../src/app/api/agendamentos/route";

const bodyValido = {
  nome: "Maria Souza",
  departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
  sala: "Sala Azul",
  data: "2026-09-21", // futura: não cai na regra RN12
  horaInicio: "10:00",
  horaFim: "11:00",
};

const criarRequest = (body: unknown): Request =>
  new Request("http://localhost/api/agendamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const post = async (body: unknown) => {
  const response = await POST(criarRequest(body));
  return { status: response.status, json: await response.json() };
};

beforeEach(() => {
  _store.length = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/agendamentos – criação", () => {
  describe("201 – sucesso", () => {
    it("cria o agendamento e devolve 201 com o id gerado", async () => {
      const { status, json } = await post(bodyValido);

      expect(status).toBe(201);
      expect(json.id).toEqual(expect.any(String));
      expect(json.id.length).toBeGreaterThan(0);
      expect(json).toMatchObject({
        nome: bodyValido.nome,
        departamento: bodyValido.departamento,
        sala: bodyValido.sala,
        data: bodyValido.data,
        horaInicio: bodyValido.horaInicio,
        horaFim: bodyValido.horaFim,
      });
      expect(json.criadoEm).toEqual(expect.any(String));
      expect(db.orm.public.Agendamento.create).toHaveBeenCalledTimes(1);
    });

    it("persiste exatamente um registro no store", async () => {
      await post(bodyValido);
      expect(_store).toHaveLength(1);
    });
  });

  describe("400 – corpo e campos inválidos", () => {
    it("rejeita JSON malformado", async () => {
      const { status, json } = await post("{ isto não é json");
      expect(status).toBe(400);
      expect(json.error).toBe("Corpo da requisição inválido.");
    });

    it("rejeita corpo que não é objeto", async () => {
      const { status } = await post("[]");
      expect(status).toBe(400);
    });

    it("rejeita campo ausente com a mensagem original", async () => {
      const semNome: Partial<typeof bodyValido> = { ...bodyValido };
      delete semNome.nome;
      const { status, json } = await post(semNome);

      expect(status).toBe(400);
      // Mensagem preservada do bloco de checagem de tipos que já existia.
      expect(json.error).toBe("Todos os campos são obrigatórios.");
    });

    it("rejeita campo com tipo errado com a mensagem original", async () => {
      const { status, json } = await post({ ...bodyValido, sala: 42 });

      expect(status).toBe(400);
      expect(json.error).toBe("Todos os campos são obrigatórios.");
    });

    it.each([
      ["nome", "O campo nome é obrigatório."],
      ["departamento", "O campo departamento é obrigatório."],
      ["sala", "O campo sala é obrigatório."],
    ])("rejeita %s vazio", async (campo, mensagem) => {
      const { status, json } = await post({ ...bodyValido, [campo]: "" });

      expect(status).toBe(400);
      expect(json.error).toBe(mensagem);
    });

    it.each([["nome"], ["departamento"], ["sala"]])(
      "rejeita %s composto apenas por espaços",
      async (campo) => {
        const { status, json } = await post({ ...bodyValido, [campo]: "   " });

        expect(status).toBe(400);
        expect(json.error).toBe(`O campo ${campo} é obrigatório.`);
      }
    );

    it("rejeita data vazia", async () => {
      const { status, json } = await post({ ...bodyValido, data: "" });

      expect(status).toBe(400);
      expect(json.error).toBe("O campo data é obrigatório.");
    });

    it.each([
      ["20/09/2026"],
      ["2026-9-21"],
      ["20260921"],
      ["2026-13-01"],
      ["2026-02-30"],
    ])("rejeita data fora do formato YYYY-MM-DD: %s", async (data) => {
      const { status, json } = await post({ ...bodyValido, data });

      expect(status).toBe(400);
      expect(json.error).toBe("Data inválida. Use o formato YYYY-MM-DD.");
    });

    it("rejeita horário de início fora do formato HH:MM", async () => {
      const { status, json } = await post({ ...bodyValido, horaInicio: "7:00" });

      expect(status).toBe(400);
      expect(json.error).toBe("Horário de início inválido. Use o formato HH:MM.");
    });

    it("rejeita horário de fim fora do formato HH:MM", async () => {
      const { status, json } = await post({ ...bodyValido, horaFim: "11h00" });

      expect(status).toBe(400);
      expect(json.error).toBe("Horário de fim inválido. Use o formato HH:MM.");
    });

    it("rejeita hora acima de 23 e minuto acima de 59", async () => {
      const horaAlta = await post({ ...bodyValido, horaInicio: "25:00" });
      expect(horaAlta.json.error).toBe(
        "Horário de início inválido. Use o formato HH:MM."
      );

      const minutoAlto = await post({ ...bodyValido, horaFim: "11:75" });
      expect(minutoAlto.json.error).toBe(
        "Horário de fim inválido. Use o formato HH:MM."
      );
    });

    it("rejeita horário de início fora da grade de 30 minutos", async () => {
      const { status, json } = await post({
        ...bodyValido,
        horaInicio: "10:10",
        horaFim: "11:00",
      });

      expect(status).toBe(400);
      expect(json.error).toBe(
        "O horário de início deve estar alinhado em blocos de 30 minutos."
      );
    });

    it("rejeita horário de fim fora da grade de 30 minutos", async () => {
      const { status, json } = await post({
        ...bodyValido,
        horaInicio: "10:00",
        horaFim: "11:45",
      });

      expect(status).toBe(400);
      expect(json.error).toBe(
        "O horário de fim deve estar alinhado em blocos de 30 minutos."
      );
    });
  });

  describe("400 – janela, duração e ordem dos horários", () => {
    it("rejeita início antes de 08:00", async () => {
      const { status, json } = await post({
        ...bodyValido,
        horaInicio: "07:30",
        horaFim: "08:30",
      });

      expect(status).toBe(400);
      expect(json.error).toBe(
        "O horário de início deve estar entre 08:00 e 17:00."
      );
    });

    it("rejeita fim depois de 17:00", async () => {
      const { status, json } = await post({
        ...bodyValido,
        horaInicio: "16:00",
        horaFim: "17:30",
      });

      expect(status).toBe(400);
      expect(json.error).toBe(
        "O horário de fim deve estar entre 08:00 e 17:00."
      );
    });

    it("rejeita fim igual ao início", async () => {
      const { status, json } = await post({
        ...bodyValido,
        horaInicio: "10:00",
        horaFim: "10:00",
      });

      expect(status).toBe(400);
      expect(json.error).toBe(
        "O horário de fim deve ser posterior ao horário de início."
      );
    });

    it("rejeita fim anterior ao início", async () => {
      const { status, json } = await post({
        ...bodyValido,
        horaInicio: "11:00",
        horaFim: "10:00",
      });

      expect(status).toBe(400);
      expect(json.error).toBe(
        "O horário de fim deve ser posterior ao horário de início."
      );
    });

    it("aceita a menor duração alcançável na grade de 30 minutos", async () => {
      // Com a grade de 30 minutos e `fim > início`, o menor delta possível já é
      // 30 minutos. A regra de duração mínima (`isDuracaoMinima`) é, portanto,
      // inalcançável pela rota e é exercitada no nível unitário, em
      // `validations.test.ts` — ela só importa para o caminho que produz
      // horários em `:29` (grade de edição).
      const { status } = await post({
        ...bodyValido,
        horaInicio: "10:00",
        horaFim: "10:30",
      });

      expect(status).toBe(201);
    });
  });

  describe("400 – RN12: horário já passado no dia corrente", () => {
    it("rejeita início já decorrido hoje", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-21T14:00:00.000Z"));

      const { status, json } = await post({
        ...bodyValido,
        data: "2026-09-21",
        horaInicio: "13:00",
        horaFim: "14:00",
      });

      expect(status).toBe(400);
      expect(json.error).toBe("Horário já passou no dia atual.");
    });
  });

  describe("409 – conflito de horário", () => {
    const semear = async () => {
      await post(bodyValido); // 10:00–11:00 na Sala Azul
    };

    it("detecta sobreposição total", async () => {
      await semear();
      const { status, json } = await post(bodyValido);

      expect(status).toBe(409);
      expect(json.error).toBe("Horário conflita com agendamento existente");
    });

    it("detecta sobreposição parcial no fim", async () => {
      await semear();
      const { status, json } = await post({
        ...bodyValido,
        horaInicio: "10:30",
        horaFim: "11:30",
      });

      expect(status).toBe(409);
      expect(json.error).toBe("Horário conflita com agendamento existente");
    });

    it("detecta sobreposição parcial no início", async () => {
      await semear();
      const { status } = await post({
        ...bodyValido,
        horaInicio: "09:30",
        horaFim: "10:30",
      });

      expect(status).toBe(409);
    });

    it("detecta sobreposição quando o início coincide", async () => {
      await semear();
      const { status } = await post({
        ...bodyValido,
        horaInicio: "10:00",
        horaFim: "10:30",
      });

      expect(status).toBe(409);
    });

    it("detecta sobreposição quando o fim coincide", async () => {
      await semear();
      const { status } = await post({
        ...bodyValido,
        horaInicio: "10:30",
        horaFim: "11:00",
      });

      expect(status).toBe(409);
    });

    it("NÃO conflita em outra sala", async () => {
      await semear();
      const { status } = await post({
        ...bodyValido,
        sala: "Sala Verde",
        horaInicio: "10:30",
        horaFim: "11:30",
      });

      expect(status).toBe(201);
    });

    it("NÃO conflita em outra data", async () => {
      await semear();
      const { status } = await post({
        ...bodyValido,
        data: "2026-09-22",
        horaInicio: "10:30",
        horaFim: "11:30",
      });

      expect(status).toBe(201);
    });

    it("NÃO conflita em reservas consecutivas (RN13)", async () => {
      await semear();
      const { status } = await post({
        ...bodyValido,
        horaInicio: "11:00",
        horaFim: "12:00",
      });

      expect(status).toBe(201);
      expect(_store).toHaveLength(2);
    });

    it("não grava nada quando há conflito", async () => {
      await semear();
      await post(bodyValido);

      expect(_store).toHaveLength(1);
    });
  });

  describe("500 – falha de persistência", () => {
    it("devolve 500 quando o create falha", async () => {
      db.orm.public.Agendamento.create.mockRejectedValueOnce(
        new Error("conexão recusada")
      );

      const { status, json } = await post(bodyValido);

      expect(status).toBe(500);
      expect(json.error).toBe("Erro interno ao criar agendamento.");
      expect(_store).toHaveLength(0);
    });
  });
});
