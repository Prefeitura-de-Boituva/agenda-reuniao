import { db } from "@/prisma/db";
import type { Models } from "@/prisma/contract.d";
import { isMesmoDepartamento } from "./validations";

export async function buscarAgendamento(idAgendamento: string) {
  // Placeholder for Prisma query – .where returns a query builder with .first()
  return db.orm.public.Agendamento.where({ id: idAgendamento }).first();
}

/**
 * Projeção que a API devolve. O hash da senha de cancelamento mora só no banco:
 * criar, listar ou editar nunca pode expor a credencial (nem offline, para quem
 * interceptar a resposta).
 */
export function respostaPublica(agendamento: Models.public_Agendamento) {
  return {
    id: agendamento.id,
    nome: agendamento.nome,
    departamento: agendamento.departamento,
    sala: agendamento.sala,
    data: agendamento.data,
    horaInicio: agendamento.horaInicio,
    horaFim: agendamento.horaFim,
    criadoEm: agendamento.criadoEm,
  };
}

export type ResultadoValidacaoDepartamento =
  | { valido: true }
  | { valido: false; motivo: "agendamento-nao-encontrado" | "departamento-nao-confere" };

type ObterAgendamento = (id: string) => Promise<Awaited<ReturnType<typeof buscarAgendamento>>>;

export async function validarDepartamento(
  idAgendamento: string,
  departamento: string,
  obterAgendamento: ObterAgendamento = buscarAgendamento
): Promise<ResultadoValidacaoDepartamento> {
  const agendamento = await obterAgendamento(idAgendamento);
  if (!agendamento) return { valido: false, motivo: "agendamento-nao-encontrado" };
  if (!isMesmoDepartamento(agendamento.departamento, departamento)) {
    return { valido: false, motivo: "departamento-nao-confere" };
  }
  return { valido: true };
}