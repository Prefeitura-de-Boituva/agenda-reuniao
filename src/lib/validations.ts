export const PERMITTED_START_TIME = "08:00";
export const PERMITTED_END_TIME = "17:00";
export const MIN_DURATION_MINUTES = 30;

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function isHorarioPermitido(hora: string): boolean {
  return hora >= PERMITTED_START_TIME && hora <= PERMITTED_END_TIME;
}

export function isDuracaoMinima(inicio: string, fim: string): boolean {
  return timeToMinutes(fim) - timeToMinutes(inicio) >= MIN_DURATION_MINUTES;
}

export function isFimMaiorQueInicio(inicio: string, fim: string): boolean {
  return fim > inicio;
}

export function isMesmoDepartamento(cadastrado: string, informado: string): boolean {
  const normalizar = (valor: string) =>
    valor
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  return normalizar(informado) === normalizar(cadastrado);
}

export function isSlotValido(inicio: string, fim: string): boolean {
  return (
    isFimMaiorQueInicio(inicio, fim) &&
    isDuracaoMinima(inicio, fim) &&
    isHorarioPermitido(inicio) &&
    isHorarioPermitido(fim)
  );
}

/**
 * Índice do dia (número inteiro) de uma data já ajustada para o horário local.
 *
 * Usamos `Date.UTC` apenas como forma de obter um inteiro comparável a partir
 * dos getters locais (`getFullYear`/`getMonth`/`getDate`). Assim a comparação
 * entre dias é feita em "dias de calendário" e não depende de fuso horário nem
 * é afetada por horário de verão (a diferença entre duas datas pode ser de 23h
 * ou 25h, mas o índice do dia continua exato).
 */
function indiceDiaLocal(data: Date): number {
  return Math.floor(
    Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86_400_000
  );
}

/** Converte "YYYY-MM-DD" (data de calendário, sem fuso) em índice de dia. */
function indiceDiaDataISO(dateISO: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!partes) return null;
  return Math.floor(
    Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) / 86_400_000
  );
}

/** true quando `dateISO` (YYYY-MM-DD) é o dia corrente no horário local. */
export function ehHoje(dateISO: string, now: Date = new Date()): boolean {
  const dia = indiceDiaDataISO(dateISO);
  return dia !== null && dia === indiceDiaLocal(now);
}

/**
 * true quando o horário de início do agendamento já decorreu — seja porque a
 * data já passou, seja porque, no dia corrente, o horário de início já passou.
 *
 * `data` é uma data de calendário (sem fuso), então a comparação de dias é feita
 * em horário local. Usar `toISOString()` (UTC) aqui misturava UTC com a hora local
 * e fazia a validação ser pulada entre 21h e 24h em fusos negativos como o UTC-3.
 */
export function jaDecorrido(
  dateISO: string,
  time: string,
  now: Date = new Date()
): boolean {
  const dia = indiceDiaDataISO(dateISO);
  if (dia === null) return false;

  const hoje = indiceDiaLocal(now);
  if (dia !== hoje) return dia < hoje; // data anterior já decorreu; futura ainda não

  const [h, m] = time.split(":").map(Number);
  return h * 60 + m < now.getHours() * 60 + now.getMinutes();
}

/** Regra RN12: só bloqueia horário passado **no dia corrente**. */
export function isPastToday(
  dateISO: string,
  time: string,
  now: Date = new Date()
): boolean {
  return ehHoje(dateISO, now) && jaDecorrido(dateISO, time, now);
}

export function getSlotError(inicio: string, fim: string): string | null {
  if (!isHorarioPermitido(inicio)) {
    return `O horário de início deve estar entre ${PERMITTED_START_TIME} e ${PERMITTED_END_TIME}.`;
  }
  if (!isHorarioPermitido(fim)) {
    return `O horário de fim deve estar entre ${PERMITTED_START_TIME} e ${PERMITTED_END_TIME}.`;
  }
  if (!isFimMaiorQueInicio(inicio, fim)) {
    return "O horário de fim deve ser posterior ao horário de início.";
  }
  if (!isDuracaoMinima(inicio, fim)) {
    return `A duração mínima é de ${MIN_DURATION_MINUTES} minutos.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validação do corpo da requisição (POST /api/agendamentos)
//
// Estas funções são aditivas: não alteram nem substituem nenhum dos validadores
// acima. Elas existem porque a checagem de tipo feita na rota (typeof === "string")
// aceita string vazia/branca e formatos inválidos — "7:00", por exemplo, passa
// da comparação textual de `isHorarioPermitido` ("7" > "0") e seria gravado.
// ---------------------------------------------------------------------------

/** Campos lidos do corpo do POST /api/agendamentos, na ordem de verificação. */
export const CAMPOS_AGENDAMENTO = [
  "nome",
  "departamento",
  "sala",
  "data",
  "horaInicio",
  "horaFim",
] as const;

/** Rótulos usados nas mensagens de erro, mais amigáveis que o nome do campo. */
const ROTULO_CAMPO: Record<string, string> = {
  nome: "nome",
  departamento: "departamento",
  sala: "sala",
  data: "data",
  horaInicio: "horário de início",
  horaFim: "horário de fim",
};

/** "HH:MM" com hora em 00–23 e minuto em 00–59. */
export function isFormatoHorarioValido(hora: string): boolean {
  const partes = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!partes) return false;
  return Number(partes[1]) <= 23 && Number(partes[2]) <= 59;
}

/**
 * "YYYY-MM-DD" que também corresponde a uma data real do calendário.
 *
 * `new Date(ano, mes - 1, dia)` normaliza datas inexistentes para o dia 0 do mês
 * seguinte (30 de fevereiro vira 1º de março), então comparar os três
 * componentes de volta já rejeita datas como "2026-02-30" e "2026-13-01".
 */
export function isDataValida(dataISO: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO);
  if (!partes) return false;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const d = new Date(ano, mes - 1, dia);
  return (
    d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia
  );
}

/** Horário alinhado na grade de 30 minutos da agenda (minuto :00 ou :30). */
export function isNaGradeDe30min(hora: string): boolean {
  if (!isFormatoHorarioValido(hora)) return false;
  return Number(hora.slice(3, 5)) % 30 === 0;
}

/**
 * Valida presença, preenchimento e formato dos campos do corpo do POST.
 *
 * Devolve a **primeira** mensagem de erro encontrada (na ordem de
 * `CAMPOS_AGENDAMENTO`) ou `null` quando o corpo está válido.
 *
 * A checagem de tipo já existente na rota roda antes desta e devolve a mensagem
 * "Todos os campos são obrigatórios."; aqui os campos ausentes não chegam, mas
 * a função os cobre para ser correta quando usada isoladamente.
 */
export function getErroCamposObrigatorios(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "Todos os campos são obrigatórios.";
  }
  const registro = body as Record<string, unknown>;

  for (const campo of CAMPOS_AGENDAMENTO) {
    const valor = registro[campo];
    if (typeof valor !== "string" || valor.trim() === "") {
      return `O campo ${ROTULO_CAMPO[campo]} é obrigatório.`;
    }
  }

  if (!isDataValida(registro.data as string)) {
    return "Data inválida. Use o formato YYYY-MM-DD.";
  }
  if (!isFormatoHorarioValido(registro.horaInicio as string)) {
    return "Horário de início inválido. Use o formato HH:MM.";
  }
  if (!isFormatoHorarioValido(registro.horaFim as string)) {
    return "Horário de fim inválido. Use o formato HH:MM.";
  }
  if (!isNaGradeDe30min(registro.horaInicio as string)) {
    return "O horário de início deve estar alinhado em blocos de 30 minutos.";
  }
  if (!isNaGradeDe30min(registro.horaFim as string)) {
    return "O horário de fim deve estar alinhado em blocos de 30 minutos.";
  }
  return null;
}