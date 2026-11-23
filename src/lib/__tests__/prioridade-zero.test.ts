import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SALAS,
  SALAS_COM_PRIORIDADE_ZERO,
  salaPermitePrioridadeZero,
} from "../agendamentoOpcoes";
import {
  MSG_PRIORIDADE_ZERO_SEM_PAPEL,
  mensagemSalaSemPrioridadeZero,
  notificacoesPrioridadeZero,
  registrarPrioridadeZero,
  type RegistroPrioridadeZero,
} from "../prioridadeZero";

describe("salaPermitePrioridadeZero", () => {
  it("aceita apenas salas cadastradas", () => {
    for (const sala of SALAS_COM_PRIORIDADE_ZERO) {
      expect(SALAS).toContain(sala);
    }
  });

  it("libera a Sala Azul", () => {
    expect(salaPermitePrioridadeZero("Sala Azul")).toBe(true);
  });

  it("nega as demais salas e valores fora do enum", () => {
    expect(salaPermitePrioridadeZero("Sala Verde")).toBe(false);
    expect(salaPermitePrioridadeZero("Sala Amarela")).toBe(false);
    expect(salaPermitePrioridadeZero("Sala Rosa")).toBe(false);
    expect(salaPermitePrioridadeZero("")).toBe(false);
  });
});

describe("notificações e auditoria da Prioridade 0", () => {
  const registro: RegistroPrioridadeZero = {
    papel: "PREFEITO",
    agendamentoId: "nova-reserva",
    nome: "Reunião do Prefeito",
    departamento: "Chefia de Gabinete",
    sala: "Sala Azul",
    data: "2026-12-01",
    horaInicio: "10:00",
    horaFim: "11:00",
    afetados: [
      {
        id: "reserva-1",
        nome: "Reunião da Fazenda",
        departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
        sala: "Sala Azul",
        data: "2026-12-01",
        horaInicio: "10:00",
        horaFim: "10:30",
      },
    ],
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("a mensagem ao departamento afetado traz data, sala e horário", () => {
    const [notificacao] = notificacoesPrioridadeZero(registro);

    expect(notificacao.departamento).toBe(registro.afetados[0].departamento);
    expect(notificacao.mensagem).toContain("2026-12-01");
    expect(notificacao.mensagem).toContain("Sala Azul");
    expect(notificacao.mensagem).toContain("10:00");
    expect(notificacao.mensagem).toContain("10:30");
    expect(notificacao.mensagem).toContain("Reunião da Fazenda");
  });

  it("sem reserva afetada não há notificação", () => {
    expect(notificacoesPrioridadeZero({ ...registro, afetados: [] })).toEqual([]);
  });

  it("a auditoria registra papel, sala, horário e afetados em JSON", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    registrarPrioridadeZero(registro);

    expect(info).toHaveBeenCalledTimes(1);
    const linha = JSON.parse(info.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(linha.evento).toBe("prioridade-zero");
    expect(linha.usuario).toEqual({ papel: "PREFEITO" });
    expect(linha.agendamentoId).toBe("nova-reserva");
    expect(linha.sala).toBe("Sala Azul");
    expect(linha.data).toBe("2026-12-01");
    expect(linha.horaInicio).toBe("10:00");
    expect(linha.horaFim).toBe("11:00");
    expect(linha.afetados).toEqual([
      {
        id: "reserva-1",
        nome: "Reunião da Fazenda",
        departamento: registro.afetados[0].departamento,
        horaInicio: "10:00",
        horaFim: "10:30",
      },
    ]);
    expect(linha.notificacoes).toHaveLength(1);
  });

  it("as mensagens de recusa são fixas para front e API concordarem", () => {
    expect(MSG_PRIORIDADE_ZERO_SEM_PAPEL).toContain("Gabinete do Prefeito");
    expect(mensagemSalaSemPrioridadeZero("Sala Verde")).toBe(
      "A Sala Verde não permite agendamentos com Prioridade 0."
    );
  });
});
