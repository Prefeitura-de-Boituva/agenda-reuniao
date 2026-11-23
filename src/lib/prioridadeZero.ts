import type { Papel } from "./acesso";

/**
 * Prioridade 0 (issue #66): mensagens, auditoria e notificações da sobreposição.
 *
 * A agenda não tem identidade por usuário — o acesso é uma senha compartilhada
 * (`src/lib/acesso.ts`). O registro de auditoria guarda então o **papel** de
 * quem criou a reserva, que é o dado de autoria disponível.
 *
 * O aviso institucional fica no formulário das salas que permitem Prioridade 0;
 * cada sobreposição também gera uma notificação estruturada no log e na resposta
 * da API, além do marcador "em conflito" na grade.
 */

export const MSG_PRIORIDADE_ZERO_SEM_PAPEL =
  "Apenas o Gabinete do Prefeito pode criar agendamentos com Prioridade 0.";

export function mensagemSalaSemPrioridadeZero(sala: string): string {
  return `A ${sala} não permite agendamentos com Prioridade 0.`;
}

export const MSG_PRIORIDADE_ZERO_INVALIDA =
  "Valor de prioridade inválido. Use NORMAL ou PREFEITO.";

/** Reserva já existente que será sobreposta pela Prioridade 0. */
export interface ReservaAfetada {
  id: string;
  nome: string;
  departamento: string;
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
}

export interface RegistroPrioridadeZero {
  papel: Papel;
  agendamentoId: string;
  nome: string;
  departamento: string;
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  afetados: ReservaAfetada[];
}

/** Texto da notificação ao departamento dono da reserva sobreposta. */
export function notificacaoParaReserva(
  registro: RegistroPrioridadeZero,
  afetada: ReservaAfetada
): string {
  return (
    `O agendamento "${afetada.nome}" (${afetada.departamento}) de ${afetada.data}, ` +
    `das ${afetada.horaInicio} às ${afetada.horaFim}, na ${registro.sala}, foi sobreposto ` +
    `por uma reunião com Prioridade 0 do Gabinete do Prefeito. Combine a nova data com o Gabinete.`
  );
}

export function notificacoesPrioridadeZero(registro: RegistroPrioridadeZero) {
  return registro.afetados.map((afetada) => ({
    departamento: afetada.departamento,
    mensagem: notificacaoParaReserva(registro, afetada),
  }));
}

/** RB5: linha de auditoria de toda criação com Prioridade 0, em JSON estruturado. */
export function registrarPrioridadeZero(registro: RegistroPrioridadeZero): void {
  console.info(
    JSON.stringify({
      evento: "prioridade-zero",
      em: new Date().toISOString(),
      usuario: { papel: registro.papel },
      agendamentoId: registro.agendamentoId,
      nome: registro.nome,
      departamento: registro.departamento,
      sala: registro.sala,
      data: registro.data,
      horaInicio: registro.horaInicio,
      horaFim: registro.horaFim,
      afetados: registro.afetados.map(({ id, nome, departamento, horaInicio, horaFim }) => ({
        id,
        nome,
        departamento,
        horaInicio,
        horaFim,
      })),
      notificacoes: notificacoesPrioridadeZero(registro),
    })
  );
}
