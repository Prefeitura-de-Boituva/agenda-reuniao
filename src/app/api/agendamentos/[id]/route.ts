import { buscarAgendamento, validarDepartamento } from "@/lib/agendamentos";
import { jaDecorrido } from "@/lib/validations";
import { db } from "@/prisma/db";

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

  try {
    const agendamento = await buscarAgendamento(id);

    // 404 – agendamento inexistente (ou já cancelado/removido)
    if (!agendamento) {
      return Response.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    // 400 – horário já decorrido (não é possível cancelar)
    if (jaDecorrido(agendamento.data, agendamento.horaInicio)) {
      return Response.json(
        { error: "Horário já passou no dia atual." },
        { status: 400 }
      );
    }

    // 403 – departamento informado não confere com o cadastrado.
    // A comparação é delegada a `validarDepartamento` (comparação case-insensitive
    // e sem acentos). O agendamento já buscado é reaproveitado via injeção para
    // não disparar uma segunda consulta ao banco. A mensagem de erro é genérica
    // de propósito: não revela o departamento cadastrado na reserva.
    const validacao = await validarDepartamento(
      id,
      departamento,
      async () => agendamento
    );
    if (!validacao.valido) {
      return Response.json(
        { error: "Departamento não autorizado a cancelar este agendamento." },
        { status: 403 }
      );
    }

    // Remove o agendamento (critério: "Remove agendamento cancelado")
    await db.orm.public.Agendamento.where({ id }).delete();

    return Response.json(
      { message: "Agendamento cancelado com sucesso." },
      { status: 200 }
    );
  } catch {
    return Response.json(
      { error: "Erro interno ao cancelar agendamento." },
      { status: 500 }
    );
  }
}