const MESES_RETENCAO = 8;

/** Subtrai meses de calendário sem deixar o dia exceder o último do mês alvo. */
export function calcularDataLimiteRetencao(hoje: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hoje);
  if (!partes) throw new RangeError("A data precisa estar no formato YYYY-MM-DD.");

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const indiceMes = ano * 12 + mes - 1 - MESES_RETENCAO;
  const anoLimite = Math.floor(indiceMes / 12);
  const mesLimite = ((indiceMes % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(anoLimite, mesLimite + 1, 0)).getUTCDate();
  const diaLimite = Math.min(dia, ultimoDia);

  return `${anoLimite}-${String(mesLimite + 1).padStart(2, "0")}-${String(diaLimite).padStart(2, "0")}`;
}
