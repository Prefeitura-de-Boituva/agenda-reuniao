import { getSlotError, isSlotValido } from "@/lib/validations";
import { temConflito } from "../../../lib/conflict";
import { db } from "@/prisma/db";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { nome, departamento, sala, data, horaInicio, horaFim } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof nome !== "string" ||
    typeof departamento !== "string" ||
    typeof sala !== "string" ||
    typeof data !== "string" ||
    typeof horaInicio !== "string" ||
    typeof horaFim !== "string"
  ) {
    return Response.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
  }

  const slotError = isSlotValido(horaInicio, horaFim)
    ? null
    : getSlotError(horaInicio, horaFim);
  if (slotError) {
    return Response.json({ error: slotError }, { status: 400 });
  }

  // Verifica conflito de horário antes de criar o agendamento
  const conflito = await temConflito(sala, data, horaInicio, horaFim);
  if (conflito) {
    return Response.json(
      { error: "Horário conflita com agendamento existente" },
      { status: 409 }
    );
  }


  return Response.json(
    { nome, departamento, sala, data, horaInicio, horaFim },
    { status: 201 }
  );
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const sala = (searchParams.get('sala') ?? '').trim();
  const data = (searchParams.get('data') ?? '').trim();

  if (!sala || !data) {
    return Response.json(
      { error: "Parâmetros 'sala' e 'data' são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const agendamentos = await db.orm.public.Agendamento.where({
      sala,
      data,
    }).orderBy({ horaInicio: 'asc' });
    return Response.json(agendamentos, { status: 200 });
  } catch (e) {
    return Response.json(
      { error: 'Erro interno ao buscar agendamentos.' },
      { status: 500 }
    );
  }
}
