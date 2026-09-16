import { getSlotError, isSlotValido } from "@/lib/validations";

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

  return Response.json(
    { nome, departamento, sala, data, horaInicio, horaFim },
    { status: 201 }
  );
}