function normalizeTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m;
  const rounded = Math.round(total / 30) * 30; // nearest 30 min
  const newH = Math.floor(rounded / 60);
  const newM = rounded % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// Clean existing in‑memory records so that horaFim ends in :00 or :30
function cleanStore() {
  if (!db?.orm?.public?._store) return;
  db.orm.public._store = db.orm.public._store.map((a: any) => ({
    ...a,
    horaFim: normalizeTime(a.horaFim),
    horaInicio: normalizeTime(a.horaInicio),
  }));
}

import { temConflito } from "../../../lib/conflict";
import { getSlotError, isSlotValido } from "@/lib/validations";
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

  // Clean store before any operation to ensure times are on 30‑minute boundaries
  cleanStore();

  // Verifica conflito de horário antes de criar o agendamento
  const conflito = await temConflito(sala, data, horaInicio, horaFim);

  if (conflito) {
    return Response.json(
      { error: "Horário conflita com agendamento existente" },
      { status: 409 }
    );
  }


  // Persist the new agendamento
  await db.orm.public.Agendamento.create({
    id: crypto.randomUUID(),
    nome,
    departamento,
    sala,
    data,
    horaInicio,
    horaFim,
    criadoEm: new Date().toISOString(),
  });

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
