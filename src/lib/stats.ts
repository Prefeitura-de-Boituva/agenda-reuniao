import type { Booking, Room } from "@/types/schedule";
import { generateTimeSlots, getBookingStatus } from "./schedule";

export interface RoomDayStat {
  roomId: string;
  roomName: string;
  /** Reservas registradas na sala para o dia. */
  bookingCount: number;
  /** Blocos de 30 minutos da grade ocupados pelas reservas do dia. */
  occupiedSlots: number;
  /** Total de blocos de 30 minutos do dia na grade. */
  totalSlots: number;
}

export interface DayStats {
  roomCount: number;
  totalBookings: number;
  totalOccupiedSlots: number;
  totalSlots: number;
  byRoom: Record<string, RoomDayStat>;
}

/**
 * Um bloco da grade conta como ocupado exatamente quando `getBookingStatus` o
 * marca como "booked" — o mesmo cálculo usado pela Grade de Horários — para que
 * os números do Início coincidam com as células pintadas lá.
 */
function countOccupiedSlots(bookings: Booking[]): number {
  return generateTimeSlots().filter(
    (slot) =>
      getBookingStatus("", slot.startTime, slot.endTime, bookings).status === "booked"
  ).length;
}

export function computeDayStats(
  rooms: Room[],
  bookingsByRoom: Record<string, Booking[]>
): DayStats {
  const totalSlots = generateTimeSlots().length;
  const byRoom: Record<string, RoomDayStat> = {};

  let totalBookings = 0;
  let totalOccupiedSlots = 0;

  for (const room of rooms) {
    const bookings = bookingsByRoom[room.id] ?? [];
    const occupiedSlots = countOccupiedSlots(bookings);
    byRoom[room.id] = {
      roomId: room.id,
      roomName: room.name,
      bookingCount: bookings.length,
      occupiedSlots,
      totalSlots,
    };
    totalBookings += bookings.length;
    totalOccupiedSlots += occupiedSlots;
  }

  return {
    roomCount: rooms.length,
    totalBookings,
    totalOccupiedSlots,
    totalSlots: totalSlots * rooms.length,
    byRoom,
  };
}
