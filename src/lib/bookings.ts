import type { Booking } from "@/types/schedule";
import { ROOMS, getMockBookings } from "@/lib/mock-data";

interface AgendamentoApi {
  id: string;
  nome: string;
  departamento: string;
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
}

/**
 * Busca os agendamentos da sala em cada data e devolve a união entre:
 *  1. os agendamentos de demonstração (getMockBookings) — os que já estavam
 *     presentes na grade de horários das salas; e
 *  2. os agendamentos reais via GET /api/agendamentos.
 * A API filtra pelo nome da sala ("Sala Azul"), enquanto a UI usa o id/slug
 * ("sala-azul"); aqui fazemos a tradução dos dois lados.
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
      const mock = getMockBookings(date).filter((b) => b.roomId === roomId);
      const reais = await buscarPorData(room.name, date);
      result[date] = mesclar(mock, reais);
    })
  );
  return result;
}

async function buscarPorData(sala: string, data: string): Promise<Booking[]> {
  const url = `/api/agendamentos?sala=${encodeURIComponent(sala)}&data=${encodeURIComponent(data)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const agendamentos = (await res.json()) as AgendamentoApi[];
    return agendamentos.map((a) => ({
      id: a.id,
      roomId: roomIdPorNome(a.sala),
      date: a.data,
      name: a.nome,
      department: a.departamento,
      startTime: a.horaInicio,
      endTime: a.horaFim,
    }));
  } catch {
    return [];
  }
}

function mesclar(mock: Booking[], reais: Booking[]): Booking[] {
  const idsReais = new Set(reais.map((b) => b.id));
  return [...mock.filter((b) => !idsReais.has(b.id)), ...reais].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
}

function roomIdPorNome(sala: string): string {
  return ROOMS.find((r) => r.name === sala)?.id ?? sala;
}