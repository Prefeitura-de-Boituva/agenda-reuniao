import { db } from "@/prisma/db";

/**
 * Verifica se há conflito de horário para a mesma sala e data.
 * Retorna true quando existe ao menos um agendamento cujo intervalo
 * sobrepõe o intervalo informado.
 */
export async function temConflito(
  sala: string,
  data: string,
  horaInicio: string,
  horaFim: string
): Promise<boolean> {
  const existentes = await db.orm.public.Agendamento.where({ sala, data });
  // Sobreposição ocorre quando início novo < fim existente && fim novo > início existente
  return existentes.some(
    (ag: { horaInicio: string; horaFim: string }) =>
      horaInicio < ag.horaFim && horaFim > ag.horaInicio
  );
}
