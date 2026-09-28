import { describe, it, expect } from "vitest";

import {
  MIN_DURATION_MINUTES,
  ehHoje,
  getErroCamposObrigatorios,
  getSlotError,
  isDataValida,
  isDuracaoMinima,
  isFimMaiorQueInicio,
  isFormatoHorarioValido,
  isHorarioPermitido,
  isNaGradeDe30min,
  isPastToday,
  isSlotValido,
  jaDecorrido,
  timeToMinutes,
} from "../validations";

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

describe("timeToMinutes", () => {
  it("converte HH:MM para minutos desde a meia-noite", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("17:00")).toBe(1020);
  });
});

describe("isHorarioPermitido (janela 08:00–17:00)", () => {
  it.each([["08:00"], ["12:00"], ["16:30"], ["17:00"]])(
    "aceita %s (limites inclusivos)",
    (hora) => {
      expect(isHorarioPermitido(hora)).toBe(true);
    }
  );

  it.each([["07:59"], ["07:30"], ["17:01"], ["18:00"], ["00:00"]])(
    "rejeita %s (fora da janela)",
    (hora) => {
      expect(isHorarioPermitido(hora)).toBe(false);
    }
  );
});

describe("isFimMaiorQueInicio", () => {
  it("aceita fim estritamente maior que o início", () => {
    expect(isFimMaiorQueInicio("10:00", "10:30")).toBe(true);
  });

  it("rejeita fim igual ao início", () => {
    expect(isFimMaiorQueInicio("10:00", "10:00")).toBe(false);
  });

  it("rejeita fim anterior ao início", () => {
    expect(isFimMaiorQueInicio("11:00", "10:00")).toBe(false);
  });
});

describe("isDuracaoMinima", () => {
  // O limite vem da constante exportada: o valor é 29 (e não 30) porque a grade
  // de edição representa o slot das :30 terminando em :29. Os testes referenciam
  // a constante para não depender desse número mágico.
  it(`aceita duração exatamente igual a MIN_DURATION_MINUTES (${MIN_DURATION_MINUTES}min)`, () => {
    const minutos = MIN_DURATION_MINUTES;
    const fim = timeToMinutes("10:00") + minutos;
    const horaFim = `${String(Math.floor(fim / 60)).padStart(2, "0")}:${String(
      fim % 60
    ).padStart(2, "0")}`;

    expect(isDuracaoMinima("10:00", horaFim)).toBe(true);
  });

  it("rejeita duração abaixo do mínimo", () => {
    expect(isDuracaoMinima("10:00", "10:20")).toBe(false);
  });

  it("rejeita duração zero ou negativa", () => {
    expect(isDuracaoMinima("10:00", "10:00")).toBe(false);
    expect(isDuracaoMinima("10:30", "10:00")).toBe(false);
  });
});

describe("isSlotValido", () => {
  it("aceita um slot dentro de todos os critérios", () => {
    expect(isSlotValido("10:00", "11:00")).toBe(true);
  });

  it("rejeita quando a janela é violada", () => {
    expect(isSlotValido("07:30", "08:30")).toBe(false);
    expect(isSlotValido("16:00", "17:30")).toBe(false);
  });

  it("rejeita quando o fim não é maior que o início", () => {
    expect(isSlotValido("10:00", "10:00")).toBe(false);
    expect(isSlotValido("11:00", "10:00")).toBe(false);
  });
});

describe("getSlotError", () => {
  it("devolve null para um slot válido", () => {
    expect(getSlotError("10:00", "11:00")).toBeNull();
  });

  it("aponta o horário de início fora da janela", () => {
    expect(getSlotError("07:30", "08:30")).toBe(
      "O horário de início deve estar entre 08:00 e 17:00."
    );
  });

  it("aponta o horário de fim fora da janela", () => {
    expect(getSlotError("16:00", "17:30")).toBe(
      "O horário de fim deve estar entre 08:00 e 17:00."
    );
  });

  it("aponta fim não posterior ao início", () => {
    expect(getSlotError("10:00", "10:00")).toBe(
      "O horário de fim deve ser posterior ao horário de início."
    );
  });

  it("aponta a duração abaixo do mínimo com o valor da constante", () => {
    expect(getSlotError("10:00", "10:20")).toBe(
      `A duração mínima é de ${MIN_DURATION_MINUTES} minutos.`
    );
  });

  it("a mensagem de fim tem precedência sobre a de duração", () => {
    // A ordem das verificações em getSlotError é intencional: quando o fim é
    // anterior ao início, essa é a causa raiz a ser reportada.
    expect(getSlotError("10:30", "10:00")).toBe(
      "O horário de fim deve ser posterior ao horário de início."
    );
  });
});

describe("isFormatoHorarioValido", () => {
  it.each([["00:00"], ["08:00"], ["10:30"], ["17:00"], ["23:59"]])(
    "aceita %s",
    (hora) => {
      expect(isFormatoHorarioValido(hora)).toBe(true);
    }
  );

  it.each([
    ["7:00"], // sem zero à esquerda
    ["24:00"],
    ["25:00"],
    ["10:60"],
    ["11:75"],
    ["10:5"],
    ["10h00"],
    ["1000"],
    [""],
  ])("rejeita %s", (hora) => {
    expect(isFormatoHorarioValido(hora)).toBe(false);
  });
});

describe("isDataValida", () => {
  it("aceita datas reais em YYYY-MM-DD", () => {
    expect(isDataValida("2026-09-20")).toBe(true);
    expect(isDataValida("2024-02-29")).toBe(true); // ano bissexto
  });

  it("rejeita datas que não existem no calendário", () => {
    expect(isDataValida("2026-02-30")).toBe(false);
    expect(isDataValida("2026-13-01")).toBe(false);
    expect(isDataValida("2026-00-10")).toBe(false);
    expect(isDataValida("2026-09-00")).toBe(false);
    expect(isDataValida("2023-02-29")).toBe(false); // ano não bissexto
  });

  it("rejeita formatos divergentes", () => {
    expect(isDataValida("20/09/2026")).toBe(false);
    expect(isDataValida("2026-9-20")).toBe(false);
    expect(isDataValida("20260920")).toBe(false);
    expect(isDataValida("")).toBe(false);
  });
});

describe("isNaGradeDe30min", () => {
  it.each([["08:00"], ["08:30"], ["16:30"], ["17:00"]])(
    "aceita %s (minuto :00 ou :30)",
    (hora) => {
      expect(isNaGradeDe30min(hora)).toBe(true);
    }
  );

  it.each([["10:10"], ["11:45"], ["08:01"], ["08:59"]])(
    "rejeita %s (fora da grade)",
    (hora) => {
      expect(isNaGradeDe30min(hora)).toBe(false);
    }
  );

  it("rejeita horário malformado sem lançar erro", () => {
    expect(isNaGradeDe30min("7:00")).toBe(false);
    expect(isNaGradeDe30min("")).toBe(false);
  });
});

describe("getErroCamposObrigatorios", () => {
  const corpoValido = {
    nome: "Maria",
    departamento: "RH",
    sala: "Sala Azul",
    data: "2026-09-21",
    horaInicio: "10:00",
    horaFim: "11:00",
  };

  it("devolve null para um corpo completo e bem formado", () => {
    expect(getErroCamposObrigatorios(corpoValido)).toBeNull();
  });

  it("rejeita corpo que não é objeto", () => {
    expect(getErroCamposObrigatorios(null)).toBe(
      "Todos os campos são obrigatórios."
    );
    expect(getErroCamposObrigatorios("texto")).toBe(
      "Todos os campos são obrigatórios."
    );
    expect(getErroCamposObrigatorios([])).toBe(
      "Todos os campos são obrigatórios."
    );
  });

  it.each([
    ["nome", "O campo nome é obrigatório."],
    ["departamento", "O campo departamento é obrigatório."],
    ["sala", "O campo sala é obrigatório."],
    ["data", "O campo data é obrigatório."],
    ["horaInicio", "O campo horário de início é obrigatório."],
    ["horaFim", "O campo horário de fim é obrigatório."],
  ])("rejeita %s ausente, vazio ou em branco", (campo, mensagem) => {
    const semCampo = { ...corpoValido };
    delete (semCampo as Record<string, unknown>)[campo];

    expect(getErroCamposObrigatorios(semCampo)).toBe(mensagem);
    expect(getErroCamposObrigatorios({ ...corpoValido, [campo]: "" })).toBe(
      mensagem
    );
    expect(getErroCamposObrigatorios({ ...corpoValido, [campo]: "   " })).toBe(
      mensagem
    );
  });

  it("rejeita data fora do formato", () => {
    expect(getErroCamposObrigatorios({ ...corpoValido, data: "20/09/2026" })).toBe(
      "Data inválida. Use o formato YYYY-MM-DD."
    );
  });

  it("rejeita horário fora do formato", () => {
    expect(
      getErroCamposObrigatorios({ ...corpoValido, horaInicio: "7:00" })
    ).toBe("Horário de início inválido. Use o formato HH:MM.");

    expect(
      getErroCamposObrigatorios({ ...corpoValido, horaFim: "11h00" })
    ).toBe("Horário de fim inválido. Use o formato HH:MM.");
  });

  it("rejeita horário fora da grade de 30 minutos", () => {
    expect(
      getErroCamposObrigatorios({ ...corpoValido, horaInicio: "10:10" })
    ).toBe("O horário de início deve estar alinhado em blocos de 30 minutos.");

    expect(
      getErroCamposObrigatorios({ ...corpoValido, horaFim: "11:45" })
    ).toBe("O horário de fim deve estar alinhado em blocos de 30 minutos.");
  });

  it("reporta o primeiro erro na ordem dos campos", () => {
    // "nome" vem antes de "data" em CAMPOS_AGENDAMENTO, então o erro de
    // preenchimento tem precedência sobre o de formato.
    expect(
      getErroCamposObrigatorios({ ...corpoValido, nome: "", data: "xx" })
    ).toBe("O campo nome é obrigatório.");
  });
});
