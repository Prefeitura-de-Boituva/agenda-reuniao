import { validarDepartamento } from "@/lib/agendamentos";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { departamento } = (body ?? {}) as Record<string, unknown>;

  if (typeof departamento !== "string" || departamento.trim() === "") {
    return Response.json(
      { error: "O campo departamento é obrigatório." },
      { status: 400 }
    );
  }

  const resultado = await validarDepartamento(id, departamento);

  if (!resultado.valido) {
    if (resultado.motivo === "agendamento-nao-encontrado") {
      return Response.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }
    return Response.json(
      { error: "Departamento não autorizado a cancelar este agendamento." },
      { status: 403 }
    );
  }

  return Response.json(
    { message: "Agendamento cancelado com sucesso." },
    { status: 200 }
  );
}