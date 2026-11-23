import {
  type Departamento,
  type Sala,
  salaPermitePrioridadeZero,
} from "@/lib/agendamentoOpcoes";
import { permitePrioridadeZero } from "@/lib/acesso";
import { buscarConflitos } from "@/lib/conflict";
import {
  MSG_PRIORIDADE_ZERO_INVALIDA,
  MSG_PRIORIDADE_ZERO_SEM_PAPEL,
  mensagemSalaSemPrioridadeZero,
  registrarPrioridadeZero,
} from "@/lib/prioridadeZero";
import { papelDaRequisicao } from "@/lib/sessao";
import {
  getErroCamposObrigatorios,
  getSlotError,
  isDataPassada,
  isPastToday,
  isSlotValido,
  MSG_DATA_PASSADA,
} from "@/lib/validations";
import { db } from "@/prisma/db";
import {
  MSG_CONFLITO_HORARIO,
  categorizarErroDb,
  registrarErroDb,
} from "@/prisma/errors";
import type { Models } from "@/prisma/contract.d";

type Prioridade = Models.public_Agendamento["prioridade"];

/**
 * `horaInicio`/`horaFim` são `varchar(5)` no contrato, o que o Prisma 8 expõe
 * como o tipo marcado `Varchar<5>`. A validação de formato (HH:MM e grade de
 * 30 min) já aconteceu antes; aqui só alinhamos o tipo com o contrato.
 */
const hora = (valor: string): Models.public_Agendamento["horaInicio"] =>
  valor as Models.public_Agendamento["horaInicio"];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { nome, departamento, sala, data, horaInicio, horaFim, prioridade } = (body ?? {}) as Record<string, unknown>;

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

  // Complemento da checagem de tipos acima: rejeita string vazia ou composta
  // apenas por espaços, `data` fora de YYYY-MM-DD, horário fora de HH:MM e
  // horário fora da grade de 30 minutos da agenda. Roda depois do bloco acima
  // para que a mensagem "Todos os campos são obrigatórios." continue sendo a
  // resposta para campo ausente ou de tipo errado.
  const erroCampos = getErroCamposObrigatorios(body);
  if (erroCampos) {
    return Response.json({ error: erroCampos }, { status: 400 });
  }

  // `getErroCamposObrigatorios` já garantiu que os valores pertencem aos enums
  // do contrato (caso contrário teria retornado 400 acima). Os casts abaixo
  // apenas alinham o tipo `string` com as uniões literais que o Prisma 8 exige.
  const salaValida = sala as Sala;
  const departamentoValido = departamento as Departamento;

  // RN16: bloqueia qualquer data de calendário anterior ao dia corrente.
  // Roda depois da validação de formato, então `data` já é YYYY-MM-DD válida.
  // A RN12 (abaixo) continua tratando apenas o horário passado no mesmo dia.
  if (isDataPassada(data)) {
    return Response.json({ error: MSG_DATA_PASSADA }, { status: 400 });
  }

  // RN12: horário já passado **no dia corrente**. A checagem é a mesma do
  // formulário (`isPastToday`), que lê o dia e a hora pelo relógio da agenda —
  // montá-la aqui com getters locais adiantava três horas num servidor UTC.
  if (isPastToday(data, horaInicio)) {
    return Response.json({ error: "Horário já passou no dia atual." }, { status: 400 });
  }

  const slotError = isSlotValido(horaInicio, horaFim)
    ? null
    : getSlotError(horaInicio, horaFim);
  if (slotError) {
    return Response.json({ error: slotError }, { status: 400 });
  }

  // Campo opcional: ausente vale `NORMAL`, e qualquer outro valor é rejeitado
  // antes de chegar ao enum/CHECK do banco (que responderia 500).
  if (prioridade !== undefined && prioridade !== "NORMAL" && prioridade !== "PREFEITO") {
    return Response.json({ error: MSG_PRIORIDADE_ZERO_INVALIDA }, { status: 400 });
  }
  const prioridadeValida: Prioridade = prioridade ?? "NORMAL";

  // Issue #66: a Prioridade 0 é a única forma de sobrepor uma reserva existente,
  // e só vale com o papel do Gabinete e numa sala que a permite. As duas
  // checagens são do servidor — esconder o controle no front não basta.
  if (prioridadeValida === "PREFEITO") {
    if (!permitePrioridadeZero(await papelDaRequisicao())) {
      return Response.json({ error: MSG_PRIORIDADE_ZERO_SEM_PAPEL }, { status: 403 });
    }
    if (!salaPermitePrioridadeZero(salaValida)) {
      return Response.json(
        { error: mensagemSalaSemPrioridadeZero(salaValida) },
        { status: 403 }
      );
    }
  }

  const novoAgendamento = {
    id: crypto.randomUUID(),
    nome,
    departamento: departamentoValido,
    sala: salaValida,
    data,
    horaInicio: hora(horaInicio),
    horaFim: hora(horaFim),
    criadoEm: new Date().toISOString(),
    prioridade: prioridadeValida,
  };

  // Checagem de sobreposição e gravação no mesmo `try`: falha de
  // infraestrutura (banco fora do ar, `DATABASE_URL` ausente) não pode escapar
  // como exceção não tratada nem no `buscarConflitos`, nem no `create`.
  try {
    const conflitos = await buscarConflitos(salaValida, data, horaInicio, horaFim);

    if (conflitos.length > 0 && prioridadeValida === "NORMAL") {
      return Response.json({ error: MSG_CONFLITO_HORARIO }, { status: 409 });
    }

    await db.orm.public.Agendamento.create(novoAgendamento);

    // RB5: toda criação com Prioridade 0 é auditada, mesmo sem reserva afetada.
    if (prioridadeValida === "PREFEITO") {
      registrarPrioridadeZero({
        papel: "PREFEITO",
        agendamentoId: novoAgendamento.id,
        nome,
        departamento,
        sala: salaValida,
        data,
        horaInicio,
        horaFim,
        afetados: conflitos.map((ag) => ({
          id: ag.id,
          nome: ag.nome,
          departamento: ag.departamento,
          sala: ag.sala,
          data: ag.data,
          horaInicio: ag.horaInicio,
          horaFim: ag.horaFim,
        })),
      });
    }

    // RB3/RB4: a reserva sobreposta continua gravada, e a resposta devolve a
    // lista de afetados para que quem criou veja quem precisa ser avisado.
    return Response.json({ ...novoAgendamento, reservasConflitadas: conflitos }, { status: 201 });
  } catch (erro) {
    // A unique e as exclusion constraints são o desempate quando duas
    // requisições simultâneas passam juntas pelo `buscarConflitos`: o perdedor
    // responde 409 (23505/23P01), e não 500.
    if (categorizarErroDb(erro) === 'conflito') {
      return Response.json({ error: MSG_CONFLITO_HORARIO }, { status: 409 });
    }
    registrarErroDb(erro, 'POST /api/agendamentos');
    return Response.json(
      { error: "Erro interno ao criar agendamento." },
      { status: 500 }
    );
  }
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
    // Prisma 8: `.orderBy` recebe um seletor e a coleção é resolvida com `.all()`.
    const agendamentos = await db.orm.public.Agendamento.where({
      sala: sala as Sala,
      data,
    })
      .orderBy((a) => a.horaInicio.asc())
      .all();
    return Response.json(agendamentos, { status: 200 });
  } catch (erro) {
    registrarErroDb(erro, 'GET /api/agendamentos');
    return Response.json(
      { error: 'Erro interno ao buscar agendamentos.' },
      { status: 500 }
    );
  }
}
