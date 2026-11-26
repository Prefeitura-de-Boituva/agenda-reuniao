import { buscarAgendamento, respostaPublica, validarDepartamento } from "@/lib/agendamentos";
import { confereSenha } from "@/lib/senhaCancelamento";
import type { Departamento } from "@/lib/agendamentoOpcoes";
import { temConflito } from "@/lib/conflict";
import {
  getErroCamposObrigatorios,
  getSlotError,
  isPastToday,
  isSlotValido,
  jaPassou,
} from "@/lib/validations";
import { db } from "@/prisma/db";
import { MSG_CONFLITO_HORARIO, categorizarErroDb, registrarErroDb } from "@/prisma/errors";
import type { Models } from "@/prisma/contract.d";

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

  const { departamento, senha } = (body ?? {}) as Record<string, unknown>;

  try {
    const agendamento = await buscarAgendamento(id);

    // 404 – agendamento inexistente (ou já cancelado/removido)
    if (!agendamento) {
      return Response.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    // 400 – reserva já encerrada: bloqueia somente quando o horário de FIM já
    // passou. Uma reunião em andamento (agora entre horaInicio e horaFim) ainda
    // pode ser cancelada. Critério da issue #20.
    if (jaPassou(agendamento.data, agendamento.horaFim)) {
      return Response.json(
        { error: "Não é possível cancelar reserva já encerrada." },
        { status: 400 }
      );
    }

    // Credencial da reserva. Desde a mudança, quem agenda cadastra uma senha e
    // ela é a única prova de autoria — o nome do departamento não serve, porque
    // aparece na grade para qualquer visitante. Reservas antigas, que ficaram
    // sem hash, continuam conferindo o departamento para não virarem órfãs.
    if (agendamento.cancelamentoSenha) {
      const autorizada = await confereSenha(
        typeof senha === "string" ? senha : "",
        agendamento.cancelamentoSenha
      );
      if (!autorizada) {
        return Response.json(
          { error: "Senha incorreta para cancelar este agendamento." },
          { status: 403 }
        );
      }
    } else {
      if (typeof departamento !== "string" || departamento.trim() === "") {
        return Response.json(
          { error: "O campo departamento é obrigatório." },
          { status: 400 }
        );
      }

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
    }

    // Remove o agendamento (critério: "Remove agendamento cancelado")
    await db.orm.public.Agendamento.where({ id }).delete();

    return Response.json(
      { message: "Agendamento cancelado com sucesso." },
      { status: 200 }
    );
  } catch (erro) {
    registrarErroDb(erro, 'DELETE /api/agendamentos/[id]');
    return Response.json(
      { error: "Erro interno ao cancelar agendamento." },
      { status: 500 }
    );
  }
}

/**
 * `horaInicio`/`horaFim` são `varchar(5)` no contrato; o Prisma 8 expõe o tipo
 * marcado `Varchar<5>`. O formato (HH:MM na grade de 30 minutos) já foi validado
 * acima, aqui só alinhamos o tipo.
 */
const hora = (valor: string): Models.public_Agendamento["horaInicio"] =>
  valor as Models.public_Agendamento["horaInicio"];

/**
 * Atualiza nome, departamento e horário de um agendamento. Sala e data não são
 * editáveis: o formulário de edição da grade não oferece esses campos e mudá-los
 * significaria mover a reserva para outra sala/dia.
 */
export async function PUT(
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

  try {
    const agendamento = await buscarAgendamento(id);
    if (!agendamento) {
      return Response.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    // Sala e data gravadas sobrescrevem o corpo: são imutáveis na edição.
    // Reaproveitar `getErroCamposObrigatorios` garante à edição as mesmas regras
    // de formato e de enums que a criação (RN de horário, departamento válido).
    const registro: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
      sala: agendamento.sala,
      data: agendamento.data,
    };
    const erroCampos = getErroCamposObrigatorios(registro);
    if (erroCampos) {
      return Response.json({ error: erroCampos }, { status: 400 });
    }

    // `getErroCamposObrigatorios` já garantiu que os quatro campos são strings
    // preenchidas e que `departamento` pertence ao enum do contrato.
    const nome = registro.nome as string;
    const horaInicio = registro.horaInicio as string;
    const horaFim = registro.horaFim as string;

    // RN12: no dia corrente, o novo horário de início não pode já ter passado.
    if (isPastToday(agendamento.data, horaInicio)) {
      return Response.json({ error: "Horário já passou no dia atual." }, { status: 400 });
    }

    const slotError = isSlotValido(horaInicio, horaFim) ? null : getSlotError(horaInicio, horaFim);
    if (slotError) {
      return Response.json({ error: slotError }, { status: 400 });
    }

    const dados = {
      nome,
      departamento: registro.departamento as Departamento,
      horaInicio: hora(horaInicio),
      horaFim: hora(horaFim),
    };

    // A reserva sendo editada não conflita consigo mesma.
    const conflito = await temConflito(
      agendamento.sala,
      agendamento.data,
      horaInicio,
      horaFim,
      id
    );
    if (conflito) {
      return Response.json({ error: MSG_CONFLITO_HORARIO }, { status: 409 });
    }

    const atualizado = await db.orm.public.Agendamento.where({ id }).update(dados);

    return Response.json(respostaPublica(atualizado ?? { ...agendamento, ...dados }), { status: 200 });
  } catch (erro) {
    // Duas edições simultâneas podem passar juntas pelo `temConflito`; a
    // constraint `@@unique([sala, data, horaInicio])` decide o perdedor, que
    // responde 409 em vez de 500.
    if (categorizarErroDb(erro) === 'conflito') {
      return Response.json({ error: MSG_CONFLITO_HORARIO }, { status: 409 });
    }
    registrarErroDb(erro, 'PUT /api/agendamentos/[id]');
    return Response.json(
      { error: "Erro interno ao atualizar agendamento." },
      { status: 500 }
    );
  }
}
