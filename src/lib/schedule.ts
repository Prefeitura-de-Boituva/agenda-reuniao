import {
  FUSO_AGENDA,
  diaDaSemanaPorIndice,
  meioDiaDaAgenda,
  meioDiaPorIndice,
  relogioDaAgenda,
} from "./fuso";
import type { Booking, Room, RoomSchedule, SlotStatus, TimeSlot } from "@/types/schedule";

export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 17;
export const SLOT_MINUTES = 30;
export const WEEKDAY_COUNT = 5;

export function generateTimeSlots(): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];

  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
    for (let minutes = 0; minutes < 60; minutes += SLOT_MINUTES) {
      const start = `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      // Cada bloco dura exatamente SLOT_MINUTES. O código anterior encurtava em
      // um minuto o slot das `:30` (`minutes + 29`), fazendo-o terminar em
      // `:59` — 10:30–10:59, ou seja, 29 minutos. O desvio era desnecessário:
      // `getBookingStatus` compara com `>=`, que já trata a igualdade
      // (10:00–10:30 casa com o slot 10:00–10:30). Ele só existia para que
      // `isDuracaoMinima` aceitasse um bloco de 30 minutos, o que obrigava
      // `MIN_DURATION_MINUTES` a valer 29 em vez de 30.
      //
      // A soma é feita em minutos totais para que o último slot do dia feche
      // em 17:00 (16:30–17:00) em vez de transbordar para 17:30.
      const endTotal = hour * 60 + minutes + SLOT_MINUTES;
      const end = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(
        endTotal % 60
      ).padStart(2, "0")}`;
      slots.push({ startTime: start, endTime: end });
    }
  }

  return slots;
}

/**
 * "YYYY-MM-DD" → um `Date` ancorado no meio-dia da agenda. Os helpers abaixo só
 * leem calendário através de `relogioDaAgenda`, então a âncora não importa para
 * eles — mas importa para qualquer `Date` que saia daqui para `Intl` ou aritmética.
 */
export function parseDate(date: string): Date {
  return meioDiaDaAgenda(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_AGENDA,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_AGENDA,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function toISODate(date: Date): string {
  return relogioDaAgenda(date).iso;
}

export function shiftDate(date: Date, days: number): Date {
  return meioDiaPorIndice(relogioDaAgenda(date).indiceDia + days);
}

export function getNextWeekday(date: Date): Date {
  let indice = relogioDaAgenda(date).indiceDia;
  do {
    indice += 1;
  } while (ehFimDeSemana(indice));
  return meioDiaPorIndice(indice);
}

export function getPreviousWeekday(date: Date): Date {
  let indice = relogioDaAgenda(date).indiceDia;
  do {
    indice -= 1;
  } while (ehFimDeSemana(indice));
  return meioDiaPorIndice(indice);
}

/** Segunda-feira da semana da agenda; domingo pertence à semana seguinte. */
export function getWeekStart(date: Date): Date {
  const { indiceDia, diaDaSemana } = relogioDaAgenda(date);
  const diasDesdeSegunda = diaDaSemana === 0 ? -1 : diaDaSemana - 1;
  return meioDiaPorIndice(indiceDia - diasDesdeSegunda);
}

function ehFimDeSemana(indiceDia: number): boolean {
  const diaDaSemana = diaDaSemanaPorIndice(indiceDia);
  return diaDaSemana === 0 || diaDaSemana === 6;
}

export function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < WEEKDAY_COUNT; i++) {
    dates.push(shiftDate(startDate, i));
  }
  return dates;
}

export function getBookingStatus(
  date: string,
  startTime: string,
  endTime: string,
  bookings: Booking[]
): { status: SlotStatus; booking?: Booking } {
  const booking = bookings.find((b) => b.startTime <= startTime && b.endTime >= endTime);
  if (booking) return { status: "booked", booking };
  return { status: "available" };
}

export function buildRoomSchedule(
  room: Room,
  startDate: Date,
  getBookingsForDate: (date: string) => Booking[]
): RoomSchedule {
  const rawSlots = generateTimeSlots();
  const weekDates = getWeekDates(getWeekStart(startDate));
  const dates = weekDates.map(toISODate);
  const slotsByDate: Record<string, TimeSlot[]> = {};

  for (const date of dates) {
    const bookings = getBookingsForDate(date);
    slotsByDate[date] = rawSlots.map((slot) => {
      const { status, booking } = getBookingStatus(date, slot.startTime, slot.endTime, bookings);
      return { ...slot, status, booking };
    });
  }

  return { roomId: room.id, roomName: room.name, dates, slotsByDate };
}

export type { RoomSchedule, TimeSlot };