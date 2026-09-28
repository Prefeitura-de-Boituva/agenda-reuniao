export const PERMITTED_START_TIME = "08:00";
export const PERMITTED_END_TIME = "17:00";
export const MIN_DURATION_MINUTES = 29;

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