import { describe, expect, it } from "vitest";

import {
  SALAS,
  SALAS_COM_PRIORIDADE_ZERO,
  salaPermitePrioridadeZero,
} from "../agendamentoOpcoes";

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
