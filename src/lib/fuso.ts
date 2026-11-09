/**
 * O fuso da agenda é o de Boituva — não o do processo.
 *
 * As regras de "hoje" (RN12/RN16) e a navegação de semana saíam dos getters locais
 * do `Date`. No Docker isso era tapado com `ENV TZ=America/Sao_Paulo` no
 * Dockerfile, mas função serverless (Vercel) roda em UTC e não obedece a `TZ`: às
 * 10h de Boituva o servidor acharia 13h e barraria slots futuros como "já passou",
 * e entre 21h e 24h o dia corrente viraria o dia seguinte, fazendo a RN16 rejeitar
 * a própria data de hoje. Este módulo é a única fonte desses campos; nada fora
 * dele deve usar `getFullYear`/`getHours`/`getDay` para decidir calendário.
 */

export const FUSO_AGENDA = "America/Sao_Paulo";

const MS_POR_DIA = 86_400_000;
const MS_POR_MINUTO = 60_000;

const formatador = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_AGENDA,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type CamposDaAgenda = {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
};

function camposDaAgenda(instanteMs: number): CamposDaAgenda {
  const partes: Record<string, string> = {};
  for (const parte of formatador.formatToParts(new Date(instanteMs))) {
    if (parte.type !== "literal") partes[parte.type] = parte.value;
  }
  return {
    ano: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
  };
}

/**
 * Deslocamento do relógio de parede da agenda sobre o instante, em milissegundos
 * (para Boituva, -10800000). Truncado ao minuto para cancelar os segundos que
 * `camposDaAgenda` descarta.
 */
function deslocamentoMs(instanteMs: number): number {
  const c = camposDaAgenda(instanteMs);
  const parede = Date.UTC(c.ano, c.mes - 1, c.dia, c.hora, c.minuto);
  return parede - Math.floor(instanteMs / MS_POR_MINUTO) * MS_POR_MINUTO;
}

export type RelogioDaAgenda = {
  /** "YYYY-MM-DD" do dia de calendário em curso no fuso da agenda. */
  iso: string;
  /** Dias de calendário desde 1970-01-01, contados no fuso da agenda. */
  indiceDia: number;
  /** Minutos desde a meia-noite do fuso da agenda. */
  minutosDoDia: number;
  /** 0 = domingo ... 6 = sábado, no fuso da agenda. */
  diaDaSemana: number;
};

export function relogioDaAgenda(date: Date = new Date()): RelogioDaAgenda {
  const c = camposDaAgenda(date.getTime());
  const indiceDia = Math.floor(Date.UTC(c.ano, c.mes - 1, c.dia) / MS_POR_DIA);
  return {
    iso: `${c.ano}-${String(c.mes).padStart(2, "0")}-${String(c.dia).padStart(2, "0")}`,
    indiceDia,
    minutosDoDia: c.hora * 60 + c.minuto,
    diaDaSemana: diaDaSemanaPorIndice(indiceDia),
  };
}

/** 0 = domingo ... 6 = sábado para um índice de dia de calendário. */
export function diaDaSemanaPorIndice(indiceDia: number): number {
  return new Date(indiceDia * MS_POR_DIA).getUTCDay();
}

function isoDeIndice(indiceDia: number): string {
  const d = new Date(indiceDia * MS_POR_DIA);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/**
 * Instante do meio-dia da agenda para um dia de calendário.
 *
 * O meio-dia é o ponto seguro de ancoragem: qualquer deslocamento de fuso até
 * ±12h continua dentro do mesmo dia de calendário, então `Date` obtidos aqui
 * sobrevivem à aritmética de dias sem vazar para o vizinho.
 */
export function meioDiaDaAgenda(iso: string): Date {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!partes) throw new RangeError(`Data fora do formato YYYY-MM-DD: ${iso}`);
  const alvo = Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), 12);
  return new Date(alvo - deslocamentoMs(alvo));
}

export function meioDiaPorIndice(indiceDia: number): Date {
  return meioDiaDaAgenda(isoDeIndice(indiceDia));
}
