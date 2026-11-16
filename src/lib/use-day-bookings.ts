"use client";

import { useEffect, useMemo, useState } from "react";
import type { Booking } from "@/types/schedule";
import { fetchBookings } from "./bookings";
import { ROOMS } from "./rooms";
import { computeDayStats, type DayStats } from "./stats";

export interface DayData {
  bookingsByRoom: Record<string, Booking[]>;
  stats: DayStats;
  /** `false` enquanto os agendamentos carregados ainda são de outra data. */
  isReady: boolean;
  /** `true` quando a busca do dia falhou: os blocos não podem mostrar zero. */
  erro: boolean;
}

/**
 * Busca os agendamentos do banco (via `GET /api/agendamentos`) para todas as
 * salas na data selecionada, de uma só vez, para que os blocos de estatísticas
 * e o bloco Agenda do Início mostrem sempre a mesma informação da Grade.
 *
 * Enquanto não há resposta o estado fica marcado como não pronto; se a busca
 * falhar, `erro` vai a `true` e nenhum número é inventado no lugar.
 *
 * `ROOMS` é importado em vez de recebido como prop: é a lista fixa de salas do
 * sistema, e uma referência nova a cada render reiniciaria o fetch.
 */
export function useDayBookings(date: string): DayData {
  const [day, setDay] = useState<{
    date: string;
    bookingsByRoom: Record<string, Booking[]>;
    erro: boolean;
  }>({ date, bookingsByRoom: {}, erro: false });

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      ROOMS.map(async (room) => ({
        roomId: room.id,
        bookings: (await fetchBookings(room.id, [date]))[date] ?? [],
      }))
    )
      .then((entries) => {
        if (cancelled) return;
        setDay({
          date,
          bookingsByRoom: Object.fromEntries(entries.map((e) => [e.roomId, e.bookings])),
          erro: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setDay({ date, bookingsByRoom: {}, erro: true });
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  return useMemo(() => {
    const isReady = day.date === date;
    const erro = isReady && day.erro;
    const bookingsByRoom = isReady && !day.erro ? day.bookingsByRoom : {};
    return { isReady, erro, bookingsByRoom, stats: computeDayStats(ROOMS, bookingsByRoom) };
  }, [day, date]);
}
