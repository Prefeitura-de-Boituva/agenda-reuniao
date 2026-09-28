import { describe, it, expect } from "vitest";

import { ehHoje, isPastToday, jaDecorrido } from "../validations";

/**
 * Os testes passam `now` explicitamente e montam as datas com `new Date(y, m, d)`,
 * ou seja, em horário local. Assim não dependem do fuso da máquina nem do
 * `process.env.TZ`, que só valeria para o processo de teste e não para o servidor.
 */
const agora = (ano: number, mes: number, dia: number, hora = 0, minuto = 0) =>
  new Date(ano, mes - 1, dia, hora, minuto, 0, 0);

/** "YYYY-MM-DD" no fuso local, espelhando `toISODate` de `lib/schedule`. */
const dataISO = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

describe("ehHoje", () => {
  it("reconhece o dia corrente em horário local", () => {
    expect(ehHoje(dataISO(2026, 9, 20), agora(2026, 9, 20, 15, 30))).toBe(true);
  });

  it("reconhece o dia corrente mesmo às 23h (caso-limite do bug de fuso)", () => {
    // Com `toISOString()`, 23h local em UTC-3 já devolviam a data de amanhã e a
    // validação de "horário passado" era pulada.
    expect(ehHoje(dataISO(2026, 9, 20), agora(2026, 9, 20, 23, 30))).toBe(true);
  });

  it("reconhece o dia corrente à meia-noite", () => {
    expect(ehHoje(dataISO(2026, 9, 20), agora(2026, 9, 20, 0, 0))).toBe(true);
  });

  it("rejeita dia anterior e dia seguinte", () => {
    expect(ehHoje(dataISO(2026, 9, 19), agora(2026, 9, 20, 12, 0))).toBe(false);
    expect(ehHoje(dataISO(2026, 9, 21), agora(2026, 9, 20, 12, 0))).toBe(false);
  });

  it("rejeita data em formato inválido", () => {
    expect(ehHoje("20/09/2026", agora(2026, 9, 20, 12, 0))).toBe(false);
    expect(ehHoje("", agora(2026, 9, 20, 12, 0))).toBe(false);
  });
});

describe("jaDecorrido", () => {
  it("detecta horário já passado no dia corrente", () => {
    expect(jaDecorrido(dataISO(2026, 9, 20), "10:30", agora(2026, 9, 20, 11, 0))).toBe(true);
  });

  it("não considera decorrido o horário ainda futuro no dia corrente", () => {
    expect(jaDecorrido(dataISO(2026, 9, 20), "10:30", agora(2026, 9, 20, 9, 0))).toBe(false);
  });

  it("trata o horário exato como ainda não decorrido (limite inclusivo)", () => {
    expect(jaDecorrido(dataISO(2026, 9, 20), "10:30", agora(2026, 9, 20, 10, 30))).toBe(false);
  });

  it("considera decorrido qualquer data anterior, mesmo com horário futuro", () => {
    expect(jaDecorrido(dataISO(2026, 9, 19), "23:30", agora(2026, 9, 20, 8, 0))).toBe(true);
    expect(jaDecorrido(dataISO(2026, 9, 1), "08:00", agora(2026, 9, 20, 8, 0))).toBe(true);
  });

  it("não considera decorrido data futura", () => {
    expect(jaDecorrido(dataISO(2026, 9, 21), "08:00", agora(2026, 9, 20, 23, 0))).toBe(false);
  });

  it("cobre a virada de mês e de ano", () => {
    expect(jaDecorrido(dataISO(2026, 8, 31), "23:59", agora(2026, 9, 1, 0, 1))).toBe(true);
    expect(jaDecorrido(dataISO(2025, 12, 31), "23:59", agora(2026, 1, 1, 0, 1))).toBe(true);
  });

  it("detecta horário passado à noite sem pular a validação (bug de UTC-3)", () => {
    // Regressão: 22h local. A data UTC já é "amanhã", então a implementação
    // antiga (toISOString) retornava false e o cancelamento era permitido.
    expect(jaDecorrido(dataISO(2026, 9, 20), "21:00", agora(2026, 9, 20, 22, 0))).toBe(true);
  });

  it("considera dia útil seguinte ainda não decorrido às 23h", () => {
    expect(jaDecorrido(dataISO(2026, 9, 21), "08:00", agora(2026, 9, 20, 23, 0))).toBe(false);
  });

  it("não quebra com data em formato inválido", () => {
    expect(jaDecorrido("20/09/2026", "10:00", agora(2026, 9, 20, 12, 0))).toBe(false);
  });
});

describe("isPastToday (regra RN12 – só o dia corrente)", () => {
  it("bloqueia horário já passado hoje", () => {
    expect(isPastToday(dataISO(2026, 9, 20), "09:00", agora(2026, 9, 20, 10, 0))).toBe(true);
  });

  it("libera horário futuro hoje", () => {
    expect(isPastToday(dataISO(2026, 9, 20), "11:00", agora(2026, 9, 20, 10, 0))).toBe(false);
  });

  it("NÃO bloqueia data anterior (comportamento preservado da RN12)", () => {
    // A RN12 trata apenas do dia corrente: um agendamento de ontem não é
    // barrado por isPastToday. Quem cobre o passado é jaDecorrido, usado no cancelamento.
    expect(isPastToday(dataISO(2026, 9, 19), "08:00", agora(2026, 9, 20, 10, 0))).toBe(false);
  });

  it("NÃO bloqueia data futura", () => {
    expect(isPastToday(dataISO(2026, 9, 21), "08:00", agora(2026, 9, 20, 10, 0))).toBe(false);
  });

  it("bloqueia horário passado hoje à noite (bug de fuso corrigido)", () => {
    expect(isPastToday(dataISO(2026, 9, 20), "21:00", agora(2026, 9, 20, 22, 0))).toBe(true);
  });
});
