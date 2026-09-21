import { db } from "../prisma/db";

export async function temConflito(
  sala: string,
  data: string,
  inicio: string,
  fim: string
): Promise<boolean> {
  // Busca todos os agendamentos da mesma sala e data
  const existentes = await db.orm.public.Agendamento.where({ sala, data })
    .orderBy({ horaInicio: "asc" });

  // Verifica se há sobreposição de horário
  return existentes.some(
    (ag: any) => inicio < ag.horaFim && fim > ag.horaInicio
  );
}
