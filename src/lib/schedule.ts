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
      const endMinutes = minutes === 0 ? minutes + 30 : minutes + 29;
      const end = `${String(hour).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      slots.push({ startTime: start, endTime: end });
    }
  }

  return slots;
}

export function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

export function getNextWeekday(date: Date): Date {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  return next;
}

export function getPreviousWeekday(date: Date): Date {
  const previous = new Date(date);
  do {
    previous.setDate(previous.getDate() - 1);
  } while (previous.getDay() === 0 || previous.getDay() === 6);
  return previous;
}

export function getWeekStart(date: Date): Date {
  const start = new Date(date);
  if (start.getDay() === 0) {
    start.setDate(start.getDate() + 1);
    return start;
  }
  const daysSinceMonday = start.getDay() - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
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