import { db } from "@/prisma/db";
import { isMesmoDepartamento } from "./validations";

export async function buscarAgendamento(idAgendamento: string) {
  return db.orm.public.Agendamento.where({ id: idAgendamento }).first();
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