import type { Sala } from "./agendamentoOpcoes";
import { db } from "../prisma/db";

export async function temConflito(
  sala: Sala,
  data: string,
  inicio: string,
  fim: string
): Promise<boolean> {
  // Busca todos os agendamentos da mesma sala e data.
  // Prisma 8: `.orderBy` recebe um seletor e a coleção precisa do terminal
  // `.all()` para ser resolvida (não é uma Promise por si só).
  const existentes = await db.orm.public.Agendamento.where({ sala, data })
    .orderBy((a) => a.horaInicio.asc())
    .all();

  // Verifica se há sobreposição de horário
  return existentes.some((ag) => inicio < ag.horaFim && fim > ag.horaInicio);
}
