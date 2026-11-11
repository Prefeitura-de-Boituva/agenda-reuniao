import { isDepartamentoValido, isSalaValida } from "./agendamentoOpcoes";
import { relogioDaAgenda } from "./fuso";

const PERMITTED_START_TIME = "08:00";
const PERMITTED_END_TIME = "17:00";
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
 * Índice do dia de calendário (dias desde 1970-01-01) em curso no fuso da agenda.
 *
 * Vem de `relogioDaAgenda`, não dos getters locais do processo: em servidor
 * serverless (UTC) os getters locais adiantariam o dia três horas e, entre 21h e
 * 24h de Boituva, fariam o dia corrente virar amanhã.
 */
function indiceDiaDaAgenda(agora: Date): number {
  return relogioDaAgenda(agora).indiceDia;
}

/** Converte "YYYY-MM-DD" (data de calendário, sem fuso) em índice de dia. */
function indiceDiaDataISO(dateISO: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!partes) return null;
  return Math.floor(
    Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) / 86_400_000
  );
}

/** true quando `dateISO` (YYYY-MM-DD) é o dia corrente no fuso da agenda. */
export function ehHoje(dateISO: string, now: Date = new Date()): boolean {
  const dia = indiceDiaDataISO(dateISO);
  return dia !== null && dia === indiceDiaDaAgenda(now);
}

/**
 * true quando o horário de início do agendamento já decorreu — seja porque a
 * data já passou, seja porque, no dia corrente, o horário de início já passou.
 *
 * `data` é uma data de calendário (sem fuso), então tanto o dia quanto a hora
 * corrente vêm do relógio da agenda (`fuso.ts`), nunca do fuso do processo.
 * Usar `toISOString()` (UTC) aqui misturava UTC com a hora local e fazia a
 * validação ser pulada entre 21h e 24h em fusos negativos como o UTC-3.
 */
export function jaDecorrido(
  dateISO: string,
  time: string,
  now: Date = new Date()
): boolean {
  const dia = indiceDiaDataISO(dateISO);
  if (dia === null) return false;

  const hoje = indiceDiaDaAgenda(now);
  if (dia !== hoje) return dia < hoje; // data anterior já decorreu; futura ainda não

  return timeToMinutes(time) < relogioDaAgenda(now).minutosDoDia;
}

/** Regra RN12: só bloqueia horário passado **no dia corrente**. */
export function isPastToday(
  dateISO: string,
  time: string,
  now: Date = new Date()
): boolean {
  return ehHoje(dateISO, now) && jaDecorrido(dateISO, time, now);
}

/** Mensagem padronizada da RN16, usada pela API e pelo formulário. */
export const MSG_DATA_PASSADA =
  "Erro 400: Não é possível agendar para uma data passada.";

/**
 * Regra RN16: true quando `dateISO` (YYYY-MM-DD) é um dia de calendário
 * **estritamente anterior** ao dia corrente no fuso da agenda.
 *
 * É independente da RN12: uma data anterior é bloqueada mesmo que o horário
 * ainda não tenha "decorrido" no relógio. Data em formato inválido devolve
 * `false`; o formato é validado antes na rota (`getErroCamposObrigatorios`).
 */
export function isDataPassada(
  dateISO: string,
  now: Date = new Date()
): boolean {
  const dia = indiceDiaDataISO(dateISO);
  if (dia === null) return false;
  return dia < indiceDiaDaAgenda(now);
}

export function jaPassou(
  data: string,
  horaFim: string,
  agora: Date = new Date()
): boolean {
  const dia = indiceDiaDataISO(data);
  if (dia === null) return false;

  const relogio = relogioDaAgenda(agora);
  if (dia !== relogio.indiceDia) return dia < relogio.indiceDia;
  return timeToMinutes(horaFim) < relogio.minutosDoDia;
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
  if (!isDepartamentoValido(registro.departamento as string)) {
    return "Departamento inválido.";
  }
  if (!isSalaValida(registro.sala as string)) {
    return "Sala inválida.";
  }
  return null;
}