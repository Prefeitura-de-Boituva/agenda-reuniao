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

export function isSlotValido(inicio: string, fim: string): boolean {
  return (
    isFimMaiorQueInicio(inicio, fim) &&
    isDuracaoMinima(inicio, fim) &&
    isHorarioPermitido(inicio) &&
    isHorarioPermitido(fim)
  );
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