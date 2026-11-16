import type { Sala } from "./agendamentoOpcoes";
import { db } from "../prisma/db";

export async function temConflito(
  sala: Sala,
  data: string,
  inicio: string,
  fim: string,
  ignorarId?: string
): Promise<boolean> {
  // Busca todos os agendamentos da mesma sala e data.
  // Prisma 8: `.orderBy` recebe um seletor e a coleção precisa do terminal
  // `.all()` para ser resolvida (não é uma Promise por si só).
  const existentes = await db.orm.public.Agendamento.where({ sala, data })
    .orderBy((a) => a.horaInicio.asc())
    .all();

  // `ignorarId` é a própria reserva sendo editada: sem ele, qualquer edição
  // conflitaria com o horário que já está gravado no banco.
  return existentes.some((ag) => {
    if (ignorarId !== undefined && ag.id === ignorarId) return false;
    return inicio < ag.horaFim && fim > ag.horaInicio;
  });
}
