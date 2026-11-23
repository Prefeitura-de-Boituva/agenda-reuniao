export type SlotStatus = "available" | "booked";

/**
 * `PREFEITO` é a Prioridade 0 da issue #66: uma reserva do Gabinete do Prefeito
 * que pode coexistir com uma reserva NORMAL já existente no mesmo horário.
 */
export type Prioridade = "NORMAL" | "PREFEITO";

export interface Booking {
  id: string;
  roomId: string;
  date: string;
  name: string;
  department: string;
  startTime: string;
  endTime: string;
  prioridade: Prioridade;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  status: SlotStatus;
  /** Todas as reservas que cobrem o bloco — mais de uma quando há Prioridade 0. */
  bookings: Booking[];
  /** Reserva exibida na célula: a de Prioridade 0, se houver, senão a primeira. */
  booking?: Booking;
}

export interface Room {
  id: string;
  name: string;
}

export interface RoomSchedule {
  roomId: string;
  roomName: string;
  dates: string[];
  slotsByDate: Record<string, TimeSlot[]>;
}
