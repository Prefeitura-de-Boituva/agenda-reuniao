import { describe, expect, it } from "vitest";

import {
  diaDaSemanaPorIndice,
  meioDiaDaAgenda,
  meioDiaPorIndice,
  relogioDaAgenda,
} from "../fuso";
import {
  getNextWeekday,
  getPreviousWeekday,
  getWeekStart,
  parseDate,
  shiftDate,
  toISODate,
} from "../schedule";
import { isDataPassada, isPastToday, jaPassou } from "../validations";

/**
 * Estas expectativas descrevem o relógio de Boituva a partir de instantes UTC
 * absolutos, então valem em qualquer fuso de processo — que é exatamente o que
 * um servidor serverless (Vercel) quebra quando as regras usam getters locais.
 */
const instante = (iso: string) => new Date(iso);

describe("relogioDaAgenda", () => {
  it("traduz 13:00Z para as 10:00 de Boituva no mesmo dia", () => {
    expect(relogioDaAgenda(instante("2026-09-21T13:00:00.000Z"))).toEqual({
      iso: "2026-09-21",
      indiceDia: Math.floor(Date.UTC(2026, 8, 21) / 86_400_000),
      minutosDoDia: 600,
      diaDaSemana: 1,
    });
  });

  it("entre 21h e 24h de Boituva o dia continua sendo o de hoje", () => {
    // 2026-09-21T01:30Z são 22:30 do dia 20 em Boituva. Ler o dia com
    // `toISOString()` devolvia "2026-09-21" e a RN12 era pulada.
    const relogio = relogioDaAgenda(instante("2026-09-21T01:30:00.000Z"));
    expect(relogio.iso).toBe("2026-09-20");
    expect(relogio.minutosDoDia).toBe(22 * 60 + 30);
    expect(relogio.diaDaSemana).toBe(0);
  });

  it("o dia da semana acompanha o calendário da agenda, não o do processo", () => {
    // 2026-09-21T00:30Z ainda é domingo (21:30) em Boituva.
    expect(
      relogioDaAgenda(instante("2026-09-21T00:30:00.000Z")).diaDaSemana
    ).toBe(0);
    expect(
      relogioDaAgenda(instante("2026-09-21T03:00:00.000Z")).diaDaSemana
    ).toBe(1);
  });
});

describe("ancora de meio-dia", () => {
  it("sobrevive a qualquer fuso de processo", () => {
    const meioDia = meioDiaDaAgenda("2026-09-21");
    expect(relogioDaAgenda(meioDia).iso).toBe("2026-09-21");
    expect(relogioDaAgenda(meioDia).minutosDoDia).toBe(720);
  });

  it("round-trip de parseDate e toISODate preserva o dia", () => {
    for (const iso of ["2026-02-01", "2026-09-21", "2026-12-31", "2027-01-01"]) {
      expect(toISODate(parseDate(iso))).toBe(iso);
    }
  });

  it("meioDiaPorIndice devolve o mesmo dia que gerou o índice", () => {
    const indice = relogioDaAgenda(instante("2026-09-21T13:00:00.000Z")).indiceDia;
    expect(toISODate(meioDiaPorIndice(indice))).toBe("2026-09-21");
    expect(diaDaSemanaPorIndice(indice)).toBe(1);
  });
});

describe("navegação de semana", () => {
  it("domingo pertence à semana seguinte", () => {
    // 2026-09-20 é domingo; a semana exibida começa na segunda 21.
    expect(toISODate(getWeekStart(instante("2026-09-21T01:00:00.000Z")))).toBe(
      "2026-09-21"
    );
  });

  it("segunda é o início da própria semana", () => {
    expect(toISODate(getWeekStart(parseDate("2026-09-21")))).toBe("2026-09-21");
    expect(toISODate(getWeekStart(parseDate("2026-09-25")))).toBe("2026-09-21");
  });

  it("shiftDate avança dias de calendário, não horas", () => {
    expect(toISODate(shiftDate(parseDate("2026-09-21"), 7))).toBe("2026-09-28");
    expect(toISODate(shiftDate(parseDate("2026-09-21"), -1))).toBe("2026-09-20");
    expect(toISODate(shiftDate(parseDate("2026-12-31"), 1))).toBe("2027-01-01");
  });

  it("sexta vai para segunda e segunda volta para sexta", () => {
    expect(toISODate(getNextWeekday(parseDate("2026-09-25")))).toBe("2026-09-28");
    expect(toISODate(getPreviousWeekday(parseDate("2026-09-21")))).toBe(
      "2026-09-18"
    );
  });
});

describe("RN12 e RN16 no relógio da agenda", () => {
  const asDez = instante("2026-09-21T13:00:00.000Z"); // 10:00 em Boituva

  it("bloqueia início anterior às 10:00 de hoje e aceita o posterior", () => {
    expect(isPastToday("2026-09-21", "09:30", asDez)).toBe(true);
    expect(isPastToday("2026-09-21", "10:30", asDez)).toBe(false);
  });

  it("não bloqueia horário futuro de outro dia", () => {
    expect(isPastToday("2026-09-22", "08:00", asDez)).toBe(false);
  });

  it("às 22:30 de hoje ainda aceita um slot das 23:00", () => {
    const asVinteEDuas = instante("2026-09-21T01:30:00.000Z"); // 20/09 22:30
    expect(isPastToday("2026-09-20", "23:00", asVinteEDuas)).toBe(false);
    expect(isPastToday("2026-09-20", "22:00", asVinteEDuas)).toBe(true);
    expect(isDataPassada("2026-09-20", asVinteEDuas)).toBe(false);
  });

  it("RN16 rejeita o dia anterior mesmo às 00:01 da agenda", () => {
    const madrugada = instante("2026-09-21T03:01:00.000Z"); // 21/09 00:01
    expect(isDataPassada("2026-09-20", madrugada)).toBe(true);
    expect(isDataPassada("2026-09-21", madrugada)).toBe(false);
  });

  it("jaPassou compara o fim com o relógio da agenda", () => {
    expect(jaPassou("2026-09-21", "09:30", asDez)).toBe(true);
    expect(jaPassou("2026-09-21", "11:30", asDez)).toBe(false);
    expect(jaPassou("2026-09-20", "17:00", asDez)).toBe(true);
    expect(jaPassou("2026-09-22", "08:00", asDez)).toBe(false);
  });
});
