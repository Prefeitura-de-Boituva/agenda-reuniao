import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/prisma/db", () => ({ db: {} }));

import { validarDepartamento } from "@/lib/agendamentos";
import type { Models } from "@/prisma/contract.d";

type Agendamento = Models.public_Agendamento;

const agendamento = {
  id: "abc-123",
  nome: "João",
  departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
  sala: "Sala AZul",
  data: "2026-09-18",
  horaInicio: "08:00",
  horaFim: "09:00",
  criadoEm: "2026-09-17T10:00:00.000Z",
} as unknown as Agendamento;

describe("validarDepartamento", () => {
  const obterAgendamento = vi.fn();

  beforeEach(() => {
    obterAgendamento.mockReset();
  });

  it("retorna agendamento-nao-encontrado quando o id não existe", async () => {
    obterAgendamento.mockResolvedValue(null);

    const resultado = await validarDepartamento("id-inexistente", "Qualquer", obterAgendamento);

    expect(obterAgendamento).toHaveBeenCalledWith("id-inexistente");
    expect(resultado).toEqual({ valido: false, motivo: "agendamento-nao-encontrado" });
  });

  it("retorna departamento-nao-confere quando os departamentos diferem", async () => {
    obterAgendamento.mockResolvedValue(agendamento);

    const resultado = await validarDepartamento(
      agendamento.id,
      "Secretaria Municipal de Assuntos Jurídicos",
      obterAgendamento
    );

    expect(resultado).toEqual({ valido: false, motivo: "departamento-nao-confere" });
  });

  it("valida quando o departamento informado confere (case-insensitive)", async () => {
    obterAgendamento.mockResolvedValue(agendamento);
    const departamentoEmMaiusculas = agendamento.departamento.toUpperCase();

    const resultado = await validarDepartamento(
      agendamento.id,
      departamentoEmMaiusculas,
      obterAgendamento
    );

    expect(resultado).toEqual({ valido: true });
  });

  it("valida quando o departamento informado confere ignorando acentos e espaços", async () => {
    obterAgendamento.mockResolvedValue(agendamento);

    const resultado = await validarDepartamento(
      agendamento.id,
      " secretaria municipal fazenda, desenvolvimento economico e financas ",
      obterAgendamento
    );

    expect(resultado).toEqual({ valido: true });
  });
});