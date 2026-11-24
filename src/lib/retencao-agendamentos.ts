import { db } from "@/prisma/db";
import { relogioDaAgenda } from "@/lib/fuso";
import { calcularDataLimiteRetencao } from "@/lib/calendario-retencao";

export { calcularDataLimiteRetencao } from "@/lib/calendario-retencao";

export interface ResultadoRetencao {
  dataLimite: string;
  dryRun: boolean;
  elegiveis: number;
  removidos: number;
}

/** Remove reservas anteriores à data que completa oito meses de retenção. */
export async function executarRetencaoAgendamentos(
  options: { dryRun?: boolean; hoje?: string } = {}
): Promise<ResultadoRetencao> {
  const hoje = options.hoje ?? relogioDaAgenda().iso;
  const dataLimite = calcularDataLimiteRetencao(hoje);
  const elegiveis = await db.orm.public.Agendamento
    .where((agendamento) => agendamento.data.lt(dataLimite))
    .all();

  if (options.dryRun ?? false) {
    return { dataLimite, dryRun: true, elegiveis: elegiveis.length, removidos: 0 };
  }

  if (elegiveis.length > 0) {
    await db.orm.public.Agendamento
      .where((agendamento) => agendamento.data.lt(dataLimite))
      .delete();
  }

  return {
    dataLimite,
    dryRun: false,
    elegiveis: elegiveis.length,
    removidos: elegiveis.length,
  };
}
