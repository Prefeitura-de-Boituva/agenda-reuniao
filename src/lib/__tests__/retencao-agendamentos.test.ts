import { describe, expect, it } from "vitest";
import { calcularDataLimiteRetencao } from "../calendario-retencao";

describe("calcularDataLimiteRetencao", () => {
  it("subtrai oito meses de calendário", () => {
    expect(calcularDataLimiteRetencao("2026-09-15")).toBe("2026-01-15");
  });

  it("limita o dia ao último dia do mês de destino", () => {
    expect(calcularDataLimiteRetencao("2026-10-31")).toBe("2026-02-28");
  });

  it("trata mudança de ano", () => {
    expect(calcularDataLimiteRetencao("2027-01-20")).toBe("2026-05-20");
  });

  it("rejeita data fora do formato ISO", () => {
    expect(() => calcularDataLimiteRetencao("15/09/2026")).toThrow(RangeError);
  });
});
