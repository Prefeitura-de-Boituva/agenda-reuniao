import { jaPassou } from "@/lib/validations";
import { hashTokenCancelamento } from "@/lib/cancelamentoToken";
import { db } from "@/prisma/db";
import { registrarErroDb } from "@/prisma/errors";

type Contexto = { params: Promise<{ token: string }> };
const PRIVATE_NO_STORE = { "Cache-Control": "no-store, private" };

async function buscarPorToken(token: string) {
  return db.orm.public.Agendamento.where({
    cancelamentoTokenHash: hashTokenCancelamento(token),
  }).first();
}

function dadosPublicos(agendamento: NonNullable<Awaited<ReturnType<typeof buscarPorToken>>>) {
  return {
    nome: agendamento.nome,
    sala: agendamento.sala,
    data: agendamento.data,
    horaInicio: agendamento.horaInicio,
    horaFim: agendamento.horaFim,
  };
}

export async function GET(_request: Request, { params }: Contexto) {
  const { token } = await params;
  if (!token) return Response.json({ error: "Link inválido." }, { status: 404, headers: PRIVATE_NO_STORE });

  try {
    const agendamento = await buscarPorToken(token);
    if (!agendamento) return Response.json({ error: "Link inválido ou agendamento indisponível." }, { status: 404, headers: PRIVATE_NO_STORE });
    return Response.json({
      agendamento: dadosPublicos(agendamento),
      podeCancelar: !jaPassou(agendamento.data, agendamento.horaFim),
    }, { headers: PRIVATE_NO_STORE });
  } catch (erro) {
    registrarErroDb(erro, "GET /api/cancelamento/[token]");
    return Response.json({ error: "Erro interno ao consultar agendamento." }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { confirmado } = await _request.json().catch(() => ({ confirmado: false }));
  if (confirmado !== true) {
    return Response.json({ error: "Confirme o cancelamento para continuar." }, { status: 400, headers: PRIVATE_NO_STORE });
  }
  const { token } = await params;
  if (!token) return Response.json({ error: "Link inválido." }, { status: 404, headers: PRIVATE_NO_STORE });

  try {
    const agendamento = await buscarPorToken(token);
    if (!agendamento) return Response.json({ error: "Link inválido ou agendamento indisponível." }, { status: 404, headers: PRIVATE_NO_STORE });
    if (jaPassou(agendamento.data, agendamento.horaFim)) {
      return Response.json({ error: "Não é possível cancelar reserva já encerrada." }, { status: 400, headers: PRIVATE_NO_STORE });
    }

    await db.orm.public.Agendamento.where({
      id: agendamento.id,
      cancelamentoTokenHash: hashTokenCancelamento(token),
    }).delete();
    return Response.json({ message: "Agendamento cancelado com sucesso." }, { headers: PRIVATE_NO_STORE });
  } catch (erro) {
    registrarErroDb(erro, "DELETE /api/cancelamento/[token]");
    return Response.json({ error: "Erro interno ao cancelar agendamento." }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}
