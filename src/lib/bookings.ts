import type { Booking, Prioridade } from "@/types/schedule";
import { ROOMS } from "@/lib/rooms";

interface AgendamentoApi {
  id: string;
  nome: string;
  departamento: string;
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  prioridade?: string;
}

/** Qualquer valor que não seja "PREFEITO" é tratado como reserva normal. */
function prioridadeDe(valor: string | undefined): Prioridade {
  return valor === "PREFEITO" ? "PREFEITO" : "NORMAL";
}

/**
 * Busca os agendamentos reais da sala (Neon, via `GET /api/agendamentos`) para
 * cada data e devolve o resultado agrupado por data.
 *
 * A API filtra pelo nome da sala ("Sala Azul"), enquanto a UI usa o id/slug
 * ("sala-azul"); aqui fazemos a tradução dos dois lados.
 *
 * Falha de rede ou resposta de erro **lança exceção**: devolver lista vazia no
 * lugar fazia a tela inicial mostrar "0 reuniões" quando o banco estava fora do
 * ar, indistinguível de um dia realmente livre. Quem chama decide como exibir.
 */
export async function fetchBookings(
  roomId: string,
  dates: string[]
): Promise<Record<string, Booking[]>> {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) return {};

  const result: Record<string, Booking[]> = {};
  await Promise.all(
    dates.map(async (date) => {
      result[date] = await buscarPorData(room.name, date);
    })
  );
  return result;
}

async function buscarPorData(sala: string, data: string): Promise<Booking[]> {
  const url = `/api/agendamentos?sala=${encodeURIComponent(sala)}&data=${encodeURIComponent(data)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`A busca de agendamentos de ${sala} em ${data} falhou (${res.status}).`);
  }

  const agendamentos = (await res.json()) as AgendamentoApi[];
  return agendamentos
    .map((a) => ({
      id: a.id,
      roomId: roomIdPorNome(a.sala),
      date: a.data,
      name: a.nome,
      department: a.departamento,
      startTime: a.horaInicio,
      endTime: a.horaFim,
      prioridade: prioridadeDe(a.prioridade),
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function roomIdPorNome(sala: string): string {
  return ROOMS.find((r) => r.name === sala)?.id ?? sala;
}
