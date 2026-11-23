import type { Sala } from "./agendamentoOpcoes";
import { db } from "../prisma/db";

/**
 * Agendamentos da mesma sala e data que se sobrepõem a `inicio`–`fim`.
 *
 * A regra de sobreposição é `inicio < ag.horaFim && fim > ag.horaInicio`:
 * blocos adjacentes (10:00–10:30 e 10:30–11:00) não conflitam (RN13).
 * `ignorarId` exclui a própria reserva, sem o que toda edição conflitaria com o
 * horário que já está gravado.
 */
export async function buscarConflitos(sala: Sala, data: string, inicio: string, fim: string, ignorarId?: string) {
  // Prisma 8: `.orderBy` recebe um seletor e a coleção precisa do terminal
  // `.all()` para ser resolvida (não é uma Promise por si só).
  const existentes = await db.orm.public.Agendamento.where({ sala, data })
    .orderBy((a) => a.horaInicio.asc())
    .all();

  return existentes.filter((ag) => {
    if (ignorarId !== undefined && ag.id === ignorarId) return false;
    return inicio < ag.horaFim && fim > ag.horaInicio;
  });
}

export async function temConflito(
  sala: Sala,
  data: string,
  inicio: string,
  fim: string,
  ignorarId?: string
): Promise<boolean> {
  return (await buscarConflitos(sala, data, inicio, fim, ignorarId)).length > 0;
}
