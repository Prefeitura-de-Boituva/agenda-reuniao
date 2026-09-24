import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Fixa o fuso em UTC para a comparação de "horário passado" não depender
// do fuso da máquina que executa os testes (ex.: UTC-3 no Brasil).
process.env.TZ = "UTC";

// Busca do agendamento é simulada – a rota não precisa de um banco real.
const agendamentoMock = vi.hoisted(() => ({
  buscarAgendamento: vi.fn(),
  validarDepartamento: vi.fn(),
}));

// O "deletar" do mock em memória é simulado para podermos assertar a chamada.
const dbMock = vi.hoisted(() => {
  const deleteAgendamento = vi.fn();
  const where = vi.fn(() => ({ delete: deleteAgendamento }));
  return { deleteAgendamento, where };
});

vi.mock("@/lib/agendamentos", () => ({
  buscarAgendamento: agendamentoMock.buscarAgendamento,
  validarDepartamento: agendamentoMock.validarDepartamento,
}));

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Agendamento: {
          where: dbMock.where,
        },
      },
    },
  },
}));

import { DELETE } from "../../../src/app/api/agendamentos/[id]/route";

// Fixture com os campos do contrato (contract.prisma)
const agendamento = {
  id: "abc-123",
  nome: "João",
  departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
  sala: "Sala Azul",
  data: "2026-09-20",
  horaInicio: "10:30",
  horaFim: "11:30",
  criadoEm: "2026-09-19T10:00:00.000Z",
};

function buildRequest(id: string, body?: unknown): Request {
  return new Request(`http://localhost/api/agendamentos/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/agendamentos/[id] – cancelamento de agendamento", () => {
  beforeEach(() => {
    agendamentoMock.buscarAgendamento.mockReset();
    agendamentoMock.validarDepartamento.mockReset();
    agendamentoMock.validarDepartamento.mockResolvedValue({ valido: true });
    dbMock.where.mockClear();
    dbMock.deleteAgendamento.mockReset();
    dbMock.deleteAgendamento.mockResolvedValue(agendamento);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna 400 quando o corpo da requisição não é JSON válido", async () => {
    const request = new Request("http://localhost/api/agendamentos/abc-123", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: "não é json",
    });

    const response = await DELETE(request, params("abc-123"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Corpo da requisição inválido.",
    });
  });

  it("retorna 400 quando o departamento não é informado", async () => {
    const response = await DELETE(buildRequest("abc-123", {}), params("abc-123"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "O campo departamento é obrigatório.",
    });
  });

  it("retorna 400 quando o departamento informado é vazio", async () => {
    const response = await DELETE(
      buildRequest("abc-123", { departamento: "   " }),
      params("abc-123")
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "O campo departamento é obrigatório.",
    });
  });

  it("retorna 404 quando o agendamento não existe", async () => {
    agendamentoMock.buscarAgendamento.mockResolvedValue(null);

    const response = await DELETE(
      buildRequest("id-inexistente", { departamento: "Qualquer" }),
      params("id-inexistente")
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Agendamento não encontrado.",
    });
  });

  it("retorna 404 quando o agendamento já foi cancelado (registro removido)", async () => {
    // Depois de cancelado, o registro é removido → a segunda tentativa vira 404.
    agendamentoMock.buscarAgendamento.mockResolvedValue(null);

    const response = await DELETE(
      buildRequest(agendamento.id, { departamento: agendamento.departamento }),
      params(agendamento.id)
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Agendamento não encontrado.",
    });
    expect(dbMock.deleteAgendamento).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o horário de fim do agendamento já passou", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T12:00:00.000Z")); // fim 11:30 < 12:00
    agendamentoMock.buscarAgendamento.mockResolvedValue(agendamento);

    const response = await DELETE(
      buildRequest(agendamento.id, { departamento: agendamento.departamento }),
      params(agendamento.id)
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Não é possível cancelar reserva já encerrada.",
    });
    expect(dbMock.deleteAgendamento).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a reserva é de um dia anterior (já encerrada)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T09:00:00.000Z")); // data 2026-09-20 < hoje
    agendamentoMock.buscarAgendamento.mockResolvedValue(agendamento);

    const response = await DELETE(
      buildRequest(agendamento.id, { departamento: agendamento.departamento }),
      params(agendamento.id)
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Não é possível cancelar reserva já encerrada.",
    });
    expect(dbMock.deleteAgendamento).not.toHaveBeenCalled();
  });

  it("permite cancelar reunião em andamento (antes do horaFim)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T11:00:00.000Z")); // entre 10:30 e 11:30
    agendamentoMock.buscarAgendamento.mockResolvedValue(agendamento);

    const response = await DELETE(
      buildRequest(agendamento.id, { departamento: agendamento.departamento }),
      params(agendamento.id)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Agendamento cancelado com sucesso.",
    });
    expect(dbMock.deleteAgendamento).toHaveBeenCalledTimes(1);
  });

  it("retorna 403 quando o departamento informado não confere", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T09:00:00.000Z"));
    agendamentoMock.buscarAgendamento.mockResolvedValue(agendamento);
    agendamentoMock.validarDepartamento.mockResolvedValue({
      valido: false,
      motivo: "departamento-nao-confere",
    });

    const response = await DELETE(
      buildRequest(agendamento.id, {
        departamento: "Secretaria Municipal de Assuntos Jurídicos",
      }),
      params(agendamento.id)
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Departamento não autorizado a cancelar este agendamento.",
    });
    expect(agendamentoMock.validarDepartamento).toHaveBeenCalledWith(
      agendamento.id,
      "Secretaria Municipal de Assuntos Jurídicos"
    );
    expect(dbMock.deleteAgendamento).not.toHaveBeenCalled();
  });

  it("retorna 200 e remove o agendamento quando o departamento confere", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T09:00:00.000Z")); // 10:30 ainda no futuro
    agendamentoMock.buscarAgendamento.mockResolvedValue(agendamento);

    // Departamentos equivalentes (case‑insensitive e sem acentos) devem validar.
    const departamentoEquivalente =
      "SECRETARIA MUNICIPAL FAZENDA, DESENVOLVIMENTO ECONOMICO E FINANCAS";

    const response = await DELETE(
      buildRequest(agendamento.id, { departamento: departamentoEquivalente }),
      params(agendamento.id)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Agendamento cancelado com sucesso.",
    });
    expect(agendamentoMock.validarDepartamento).toHaveBeenCalledWith(
      agendamento.id,
      departamentoEquivalente
    );
    expect(dbMock.where).toHaveBeenCalledWith({ id: agendamento.id });
    expect(dbMock.deleteAgendamento).toHaveBeenCalledTimes(1);
  });
});