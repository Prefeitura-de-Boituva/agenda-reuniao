import {
  FUSO_AGENDA,
  meioDiaDaAgenda,
  meioDiaPorIndice,
  relogioDaAgenda,
} from "./fuso";
import type { Booking, Room, RoomSchedule, SlotStatus, TimeSlot } from "@/types/schedule";

export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 17;
export const SLOT_MINUTES = 30;
const WEEKDAY_COUNT = 5;

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

/** Segunda-feira da semana da agenda; domingo pertence à semana seguinte. */
export function getWeekStart(date: Date): Date {
  const { indiceDia, diaDaSemana } = relogioDaAgenda(date);
  const diasDesdeSegunda = diaDaSemana === 0 ? -1 : diaDaSemana - 1;
  return meioDiaPorIndice(indiceDia - diasDesdeSegunda);
}

export function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < WEEKDAY_COUNT; i++) {
    dates.push(shiftDate(startDate, i));
  }
  return dates;
}

/**
 * Um bloco pode ter **mais de uma** reserva: a Prioridade 0 da issue #66 permite
 * que uma reunião do Gabinete coexista com a reserva normal do mesmo horário.
 * `bookings` traz todas; `booking` é a que a célula exibe — a de Prioridade 0
 * quando existe, porque é ela que passa a valer no horário.
 */
export function getBookingStatus(
  date: string,
  startTime: string,
  endTime: string,
  bookings: Booking[]
): { status: SlotStatus; booking?: Booking; bookings: Booking[] } {
  const queCobrem = bookings.filter(
    (b) => b.startTime <= startTime && b.endTime >= endTime
  );
  if (queCobrem.length === 0) return { status: "available", bookings: [] };
  const principal =
    queCobrem.find((b) => b.prioridade === "PREFEITO") ?? queCobrem[0];
  return { status: "booked", booking: principal, bookings: queCobrem };
}

/**
 * Mesma regra de sobreposição de `buscarConflitos` (src/lib/conflict.ts) e do
 * BookingFormModal: dois intervalos conflitam quando `startTime < b.endTime &&
 * b.startTime < endTime`. Blocos adjacentes (10:00–10:30 vs 10:30–11:00) não
 * conflitam. `ignoreId` exclui o próprio agendamento em edições.
 */
export function listBookingConflicts(
  startTime: string,
  endTime: string,
  bookings: Booking[],
  ignoreId?: string
): Booking[] {
  return bookings.filter(
    (b) => b.id !== ignoreId && b.startTime < endTime && startTime < b.endTime
  );
}

export function findBookingConflict(
  startTime: string,
  endTime: string,
  bookings: Booking[],
  ignoreId?: string
): Booking | undefined {
  return listBookingConflicts(startTime, endTime, bookings, ignoreId)[0];
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
    const bookingsDoDia = getBookingsForDate(date);
    slotsByDate[date] = rawSlots.map((slot) => {
      const { status, booking, bookings } = getBookingStatus(
        date,
        slot.startTime,
        slot.endTime,
        bookingsDoDia
      );
      return { ...slot, status, booking, bookings };
    });
  }

  return { roomId: room.id, roomName: room.name, dates, slotsByDate };
}

export type { RoomSchedule, TimeSlot };