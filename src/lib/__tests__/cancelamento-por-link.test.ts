import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashTokenCancelamento, gerarTokenCancelamento } from "@/lib/cancelamentoToken";

const mock = vi.hoisted(() => ({ record: null as Record<string, unknown> | null, deleted: vi.fn() }));

vi.mock("@/prisma/db", () => ({
  db: { orm: { public: { Agendamento: {
    where: vi.fn((filter: Record<string, unknown>) => ({
      first: vi.fn().mockResolvedValue(mock.record && Object.entries(filter).every(([key, value]) => mock.record?.[key] === value) ? mock.record : null),
      delete: mock.deleted,
      orderBy: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue(mock.record ? [mock.record] : []) }),
    })),
  } } } },
}));

import { GET, DELETE } from "../../app/api/cancelamento/[token]/route";
import { GET as listar } from "../../app/api/agendamentos/route";

const token = "token-de-teste";
const agendamento = {
  id: "id-1", nome: "Maria", departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
  sala: "Sala Azul", data: "2026-09-22", horaInicio: "10:00", horaFim: "11:00",
  criadoEm: "2026-09-21T10:00:00.000Z", cancelamentoTokenHash: hashTokenCancelamento(token),
};
const params = { params: Promise.resolve({ token }) };
const confirmar = () => new Request("http://localhost", { method: "DELETE", body: JSON.stringify({ confirmado: true }) });

describe("cancelamento por link", () => {
  beforeEach(() => {
    mock.record = { ...agendamento };
    mock.deleted.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T12:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("gera tokens imprevisíveis de tamanho adequado e guarda somente seu hash", () => {
    const primeiro = gerarTokenCancelamento();
    const segundo = gerarTokenCancelamento();
    expect(primeiro).toHaveLength(43);
    expect(primeiro).not.toBe(segundo);
    expect(hashTokenCancelamento(primeiro)).not.toBe(primeiro);
  });

  it("consulta apenas dados mínimos com token válido", async () => {
    const response = await GET(new Request("http://localhost"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      agendamento: { nome: "Maria", sala: "Sala Azul", data: "2026-09-22", horaInicio: "10:00", horaFim: "11:00" },
      podeCancelar: true,
    });
  });

  it("não permite consultar nem cancelar com token inválido", async () => {
    mock.record = null;
    expect((await GET(new Request("http://localhost"), params)).status).toBe(404);
    expect((await DELETE(confirmar(), params)).status).toBe(404);
    expect(mock.deleted).not.toHaveBeenCalled();
  });

  it("exige DELETE explícito e bloqueia reservas encerradas", async () => {
    const consulta = await GET(new Request("http://localhost"), params);
    expect(consulta.status).toBe(200);
    expect(mock.deleted).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-09-22T15:00:00.000Z"));
    const response = await DELETE(confirmar(), params);
    expect(response.status).toBe(400);
    expect(mock.deleted).not.toHaveBeenCalled();
  });

  it("remove a reserva somente após confirmação pelo token", async () => {
    const semConfirmacao = await DELETE(new Request("http://localhost", { method: "DELETE" }), params);
    expect(semConfirmacao.status).toBe(400);
    expect(mock.deleted).not.toHaveBeenCalled();
    const response = await DELETE(confirmar(), params);
    expect(response.status).toBe(200);
    expect(mock.deleted).toHaveBeenCalledTimes(1);
  });

  it("não inclui o hash nas listagens gerais", async () => {
    const response = await listar(new Request("http://localhost/api/agendamentos?sala=Sala%20Azul&data=2026-09-22"));
    const json = await response.json();
    expect(JSON.stringify(json)).not.toContain("cancelamentoTokenHash");
  });
});
