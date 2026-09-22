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

export function isPastToday(dateISO: string, time: string): boolean {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (dateISO !== today) return false;
  const [h, m] = time.split(":").map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return h * 60 + m < minutesNow;
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